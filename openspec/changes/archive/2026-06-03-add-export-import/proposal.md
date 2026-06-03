## Why

Users currently have no way to move their data out of — or into — TiDaTra without
direct database access. This creates two pain points:

1. **No backup path.** Local-first data lives only in PouchDB in the browser. If the
   browser is cleared, the device is lost, or the user hasn't signed in to sync, the data
   is gone with no recovery option.
2. **No migration path.** Moving to a new browser or device before signing in means
   starting over. There is also no way to share a subset of data with a third-party tool
   for further analysis (e.g. a spreadsheet or custom visualization).

A simple JSON export/import round-trip solves both problems without requiring an account
or a server.

## What Changes

- **Export**: A new `/export-import` page lets the user select which series to export
  (all non-archived, non-deleted series are pre-selected; archived non-deleted series are
  available as an opt-in). Only non-deleted entries belonging to the selected series are
  included. The result is a single `.json` file the browser downloads.
- **Import**: On the same page the user can pick a previously exported `.json` file. For
  each document in the file the import logic compares `updatedAt` timestamps: if the
  incoming document is newer than what is in the local DB (or absent), it is written;
  otherwise it is skipped. The user sees a summary (inserted / updated / skipped counts)
  when the import finishes.
- **Navigation**: A link to `/export-import` is added to the user menu in `AppHeader`
  (alongside the existing Settings link).

## Capabilities

### New Capabilities

- `data-export`: User selects a subset of series and downloads a self-contained JSON file
  containing those series (metadata) and all of their non-deleted entries.
- `data-import`: User picks an exported JSON file; the app merges it into the local DB
  using last-write-wins based on `updatedAt`.

## Impact

- `lib/db/transfer.ts` — new module with `exportData()` and `importData()` pure async
  functions operating on PouchDB.
- `lib/db/transfer.test.ts` — unit tests using the in-memory PouchDB adapter.
- `app/export-import/page.tsx` — new client page with Export card and Import card.
- `lib/i18n/en.ts` — new `transfer` section for all UI strings.
- `components/app-header.tsx` — one new `DropdownMenuItem` linking to `/export-import`.
- No new npm dependencies. No changes to the API routes, CouchDB model, or sync logic.
