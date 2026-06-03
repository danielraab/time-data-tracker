## Context

TiDaTra stores all data in PouchDB (client-side). The domain has two document types:
`Series` and `Entry`, both extending `BaseDoc` which carries `_id`, `_rev`,
`createdAt`, `updatedAt`, and optional `deletedAt`. Soft deletion sets `deletedAt`
rather than removing the document.

Existing data-layer conventions (from `lib/db/series-repo.ts` and
`lib/db/entries-repo.ts`):
- `listSeries()` — active, non-archived, non-deleted series
- `listArchivedSeries()` — archived, non-deleted series
- `listAllActiveEntries()` — all non-deleted entries across all series
- `db.bulkDocs()` — used for batch writes; PouchDB merges by `_id` / `_rev`

The page follows the same pattern as `app/maintenance/page.tsx`:
`"use client"`, single page component, Card-based layout, all strings from `lib/i18n/en.ts`.

## Goals / Non-Goals

**Goals:**

- Export: produce a valid JSON file containing selected non-deleted series and their
  non-deleted entries.
- Import: read a JSON file and upsert documents using `updatedAt` as the conflict
  arbiter (last-write-wins).
- Show a per-series checkbox list on export with select-all / deselect-all toggle.
- Include archived series in export as opt-in (collapsed section, unchecked by default).
- Show import result counts (inserted, updated, skipped) to the user.
- Link the page from the `AppHeader` user menu.

**Non-Goals:**

- Exporting soft-deleted (trashed) documents.
- Password-protecting or encrypting the export file.
- Importing files from other tools (only TiDaTra export format is supported).
- Triggering a CouchDB sync after import (the existing auto-sync will pick it up).
- Merging GPS coordinates or resolving span_start/span_end link integrity during import.

## Decisions

### D1 — File format: versioned JSON envelope

**Decision**: The JSON file has a top-level envelope:
```json
{
  "version": 1,
  "exportedAt": "<ISO timestamp>",
  "series": [ ...Series docs ],
  "entries": [ ...Entry docs ]
}
```
`_rev` is stripped on export because it is a PouchDB-internal field that must not be
carried across databases.

**Rationale**: A version field lets future format changes be detected and rejected with
a clear error. Stripping `_rev` avoids PouchDB conflict errors on import into a DB that
has different revision history.

**Alternative considered**: CSV — rejected because entries have heterogeneous fields
(label, value, gps) that don't map cleanly to a flat table.

### D2 — Import conflict resolution: updatedAt last-write-wins

**Decision**: For each document in the import file:
1. Attempt `db.get(_id)`.
2. If not found → insert (omit `_rev`).
3. If found and `importedDoc.updatedAt > localDoc.updatedAt` → update (set `_rev` from local).
4. Otherwise → skip.

**Rationale**: `updatedAt` is always set on every write in this project and is an ISO
8601 string, so lexicographic comparison is correct. This mirrors how CouchDB sync would
resolve the same conflict (most-recent write survives).

**Alternative considered**: Always overwrite → rejected because importing a file multiple
times, or importing an older backup, would silently roll back newer local edits.

### D3 — `lib/db/transfer.ts` for all logic

**Decision**: All export and import logic lives in `lib/db/transfer.ts`, a pure async
module that receives/returns plain data. The page component calls these functions and
handles UI state.

**Rationale**: Keeps logic testable with the in-memory PouchDB adapter (same pattern as
`lib/db/entries-repo.test.ts`). The page stays a thin controller.

### D4 — Series selection as checkboxes, not a modal

**Decision**: The export card renders a checkbox list directly on the page — one checkbox
per series — with a "Select all / Deselect all" toggle. Archived series are grouped in a
collapsible section below, unchecked by default.

**Rationale**: The number of series is expected to be small (tens, not thousands). An
inline list is simpler to implement and review than a modal picker.

### D5 — File download via Blob URL, file pick via `<input type="file">`

**Decision**: Export triggers a hidden `<a>` click with a `blob:` URL. Import uses a
hidden `<input type="file" accept=".json">`.

**Rationale**: Standard browser APIs, no library needed.

## Data Flow

### Export

```
user selects series checkboxes
         │
         ▼
exportData(selectedIds)          ← lib/db/transfer.ts
  ├─ listSeries() + listArchivedSeries()  → filter to selectedIds
  ├─ for each selected series: listEntries(seriesId) → filter !deletedAt
  ├─ strip _rev from all docs
  └─ return ExportFile { version, exportedAt, series, entries }
         │
         ▼
JSON.stringify → Blob → URL.createObjectURL
         │
         ▼
<a download="tidatra-export-YYYY-MM-DD.json"> click
```

### Import

```
user picks .json file
         │
         ▼
FileReader.readAsText
         │
         ▼
JSON.parse + validate version field
         │
         ▼
importData(parsedFile)           ← lib/db/transfer.ts
  for each series doc:
    db.get(_id)
    ├─ not found  → db.put(doc without _rev)              → inserted++
    ├─ found, imported newer → db.put({...doc, _rev})     → updated++
    └─ found, local newer    → skip                       → skipped++
  (same logic for entries)
         │
         ▼
ImportResult { seriesInserted, seriesUpdated, seriesSkipped,
               entriesInserted, entriesUpdated, entriesSkipped }
         │
         ▼
UI shows summary
```

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Import file from a different user contains foreign `ownerId` values | `ownerId` is preserved as-is; it is informational and not used for access control in local-first mode |
| Very large export (thousands of entries) blocks the UI thread on `JSON.stringify` | Acceptable for v1; async file download pattern yields control after Blob creation |
| Import of a partial file (network-interrupted export) silently inserts partial data | The version + structure validation at parse time catches obviously malformed files; partial series data is a user error and not guarded against |
| `_id` collisions if two users share an export file | IDs are UUID-based (`series:<uuid>`, `entry:<uuid>`); collisions are astronomically unlikely |
