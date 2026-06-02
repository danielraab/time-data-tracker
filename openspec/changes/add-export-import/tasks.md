## 1. Add i18n strings

- [x] 1.1 In `lib/i18n/en.ts`, add a `transfer` section after the `maintenance` block:
  ```ts
  transfer: {
    title: "Export / Import",
    backToHome: "Back",
    exportHeading: "Export data",
    exportIntro: "Select the series you want to export. Only active (non-deleted) entries are included.",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    archivedSection: "Archived series",
    noSeries: "No series found.",
    exportButton: "Download JSON",
    exportButtonBusy: "Preparing…",
    importHeading: "Import data",
    importIntro: "Pick a TiDaTra export file (.json). Existing documents are updated only if the imported version is newer.",
    importButton: "Choose file & import",
    importBusy: "Importing…",
    importSuccess: (s: number, e: number) =>
      `Imported: ${s} series, ${e} entries.`,
    importSkipped: (n: number) => `${n} document${n === 1 ? "" : "s"} skipped (already up to date).`,
    importError: "Could not read the file. Make sure it is a valid TiDaTra export.",
    importVersionError: "Unsupported file version. Export the file again with this version of TiDaTra.",
  },
  ```
- [x] 1.2 Add `exportImport: "Export / Import"` to the `auth` section (used in the header menu item label).

## 2. Create `lib/db/transfer.ts`

- [x] 2.1 Define and export the `ExportFile` interface:
  ```ts
  export interface ExportFile {
    version: 1;
    exportedAt: string;
    series: Series[];
    entries: Entry[];
  }
  ```
- [x] 2.2 Define and export the `ImportResult` interface:
  ```ts
  export interface ImportResult {
    seriesInserted: number;
    seriesUpdated: number;
    seriesSkipped: number;
    entriesInserted: number;
    entriesUpdated: number;
    entriesSkipped: number;
  }
  ```
- [x] 2.3 Implement `exportData(seriesIds: string[]): Promise<ExportFile>`:
  - Fetch all series via `listSeries()` and `listArchivedSeries()` and filter to
    `seriesIds`.
  - For each series, call `listEntries(series._id)` (already filters `deletedAt`).
  - Strip `_rev` from every doc before adding to the result.
  - Return `{ version: 1, exportedAt: new Date().toISOString(), series, entries }`.
- [x] 2.4 Implement `importData(file: ExportFile): Promise<ImportResult>`:
  - Initialise result counters to 0.
  - Process `file.series` then `file.entries` using the same per-doc logic:
    1. Try `db.get(doc._id)`.
    2. Not found → `db.put({ ...doc, _rev: undefined })` → increment inserted.
    3. Found and `doc.updatedAt > local.updatedAt` → `db.put({ ...doc, _rev: local._rev })` → increment updated.
    4. Otherwise → increment skipped.
  - Return the result object.
- [x] 2.5 Add a `/** Pure helper — exported for unit tests. */` JSDoc comment only on
  helper functions extracted for testing (if any).

## 3. Create `lib/db/transfer.test.ts`

- [x] 3.1 Set up an in-memory PouchDB instance (same pattern as `lib/db/entries-repo.test.ts`
  — import `PouchDB` and `pouchdb-adapter-memory`, and mock `./pouch`).
- [x] 3.2 Test `exportData`:
  - Seed a series and two entries; export with that series ID.
  - Assert result has `version: 1`, contains the series, contains both entries.
  - Assert `_rev` is absent from exported docs.
  - Assert deleted entries are excluded (seed a soft-deleted entry and verify it's missing).
- [x] 3.3 Test `importData` — insert path:
  - Call `importData` with a file containing a series and an entry that do not exist locally.
  - Assert `seriesInserted === 1` and `entriesInserted === 1`.
  - Assert the docs are now retrievable via `db.get`.
- [x] 3.4 Test `importData` — update path:
  - Seed a series with `updatedAt = "2024-01-01T00:00:00.000Z"`.
  - Import the same series with `updatedAt = "2025-01-01T00:00:00.000Z"`.
  - Assert `seriesUpdated === 1` and the local doc now has the newer `updatedAt`.
- [x] 3.5 Test `importData` — skip path:
  - Seed a series with `updatedAt = "2025-01-01T00:00:00.000Z"`.
  - Import the same series with `updatedAt = "2024-01-01T00:00:00.000Z"`.
  - Assert `seriesSkipped === 1` and the local doc is unchanged.

## 4. Create `app/export-import/page.tsx`

- [x] 4.1 Add `"use client"` directive; import `t` from `lib/i18n/en`, `exportData`,
  `importData`, `ExportFile` from `lib/db/transfer`, and needed shadcn/ui components
  (`Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Checkbox`).
- [x] 4.2 Build `ExportCard` component:
  - On mount, load series via `listSeries()` and `listArchivedSeries()` from the
    series-repo (import these directly; no server call needed).
  - Render a checkbox per active series, all checked by default.
  - Render a collapsible "Archived series" section (collapsed by default) with archived
    series unchecked by default.
  - Provide a "Select all / Deselect all" toggle button that operates on the full list.
  - On "Download JSON" click:
    1. Set busy state.
    2. Call `exportData(selectedIds)`.
    3. `JSON.stringify` the result.
    4. Create a `Blob` with `type: "application/json"`.
    5. Create an object URL, create a hidden `<a>` with `download="tidatra-export-YYYY-MM-DD.json"`,
       click it, then revoke the URL.
    6. Clear busy state.
- [x] 4.3 Build `ImportCard` component:
  - Hidden `<input type="file" accept=".json">` with a ref.
  - "Choose file & import" button triggers `inputRef.current.click()`.
  - On `onChange`:
    1. Set busy state, clear previous result.
    2. Read the file with `FileReader.readAsText`.
    3. `JSON.parse` in a try/catch; if it throws or `parsed.version !== 1`, set error state.
    4. Call `importData(parsed)`.
    5. Set result state; clear busy.
  - Display inserted + updated counts from `ImportResult` as success message.
  - Display skipped count as secondary info if > 0.
  - Display error message on failure.
- [x] 4.4 Compose the page:
  ```tsx
  export default function ExportImportPage() {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/"><ArrowLeft className="size-4" />{t.transfer.backToHome}</Link>
          </Button>
          <h1 className="text-lg font-semibold">{t.transfer.title}</h1>
        </div>
        <ExportCard />
        <ImportCard />
      </main>
    );
  }
  ```

## 5. Add navigation link in AppHeader

- [x] 5.1 In `components/app-header.tsx`, add an import for `DownloadIcon` (or
  `ArrowDownToLineIcon`) from `lucide-react`.
- [x] 5.2 In the signed-in dropdown, add a new `DropdownMenuItem` linking to
  `/export-import` inside the existing `DropdownMenuGroup` that contains the Settings
  link:
  ```tsx
  <DropdownMenuItem asChild>
    <Link href="/export-import">
      <DownloadIcon />
      {t.auth.exportImport}
    </Link>
  </DropdownMenuItem>
  ```

## 6. Verification

- [x] 6.1 Run `pnpm lint` — no type or lint errors in any changed file.
- [x] 6.2 Run `pnpm test` — all tests pass, including the new `transfer.test.ts`.
- [ ] 6.3 Manual: navigate to `/export-import`, select one series, click "Download JSON",
  verify the file downloads and contains only that series and its entries (no deleted entries).
- [ ] 6.4 Manual: import the downloaded file back in a fresh browser profile (or after
  clearing PouchDB) — verify entries appear on the dashboard.
- [ ] 6.5 Manual: import the same file again — verify skipped count equals total doc
  count (no duplicates).
