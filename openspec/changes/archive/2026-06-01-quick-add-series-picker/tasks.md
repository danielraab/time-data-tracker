## 1. i18n strings

- [x] 1.1 Add `quickAddSeriesPickerLabel` (aria-label for the trigger button) to `lib/i18n/en.ts`
- [x] 1.2 Add `quickAddSeriesPickerNavigate` (tooltip/aria-label for the navigate-to-series icon link) to `lib/i18n/en.ts`

## 2. Quick Add component

- [x] 2.1 Import `useSeriesList` from `lib/db/hooks` and `setDefaultSeries` from `lib/db/series-repo` in `components/dashboard/quick-add.tsx`
- [x] 2.2 Add `isPending` state to track in-flight `setDefaultSeries` calls
- [x] 2.3 Replace the series `<Link>` with a `<DropdownMenu>` trigger that shows the current series title and a chevron icon
- [x] 2.4 Populate the dropdown with all non-archived series from `useSeriesList`; mark the current default with a checkmark
- [x] 2.5 On item select, call `setDefaultSeries` (skip if already default), set/clear `isPending`, and close the menu
- [x] 2.6 Disable all dropdown items while `isPending` is true
- [x] 2.7 Add a small external-link icon inside each dropdown item that links to the series detail page (using `seriesPath`)

## 3. Tests

- [x] 3.1 Extract a pure helper from the component (e.g., `buildPickerItems`) that maps a series list + current default id to the display model, and write a unit test for it in `components/dashboard/quick-add.test.ts`
