## 1. Data Model

- [x] 1.1 Add `maxDurationMinutes?: number` to the `Series` interface in `lib/types.ts`
- [x] 1.2 Update `SeriesInput` type in `lib/types.ts` to include `maxDurationMinutes`
- [x] 1.3 Update `createSeries` in `lib/db/series-repo.ts` to persist `maxDurationMinutes`
- [x] 1.4 Update `updateSeries` (or equivalent edit function) in `lib/db/series-repo.ts` to persist `maxDurationMinutes`

## 2. i18n Strings

- [x] 2.1 Add `maxDurationLabel`, `maxDurationPlaceholder`, and `maxDurationHint` strings to `lib/i18n/en.ts` under the `series` key

## 3. Series Form

- [x] 3.1 Add `maxDurationMinutes` state variable to `components/series/series-form.tsx`
- [x] 3.2 Add numeric input field for max duration to the series form (between tags and submit), using the new i18n strings
- [x] 3.3 Validate that the input is either empty or a positive integer; prevent form submission if invalid
- [x] 3.4 Pass `maxDurationMinutes` to `createSeries` / `updateSeries` call in the form submit handler
- [x] 3.5 Populate the max duration input from existing series data when the form is used for editing

## 4. Duration Overrun Helpers

- [x] 4.1 Add `spanDurationMinutes(start: Entry, end: Entry | null, nowMs: number): number` pure helper to `lib/spans.ts` that returns elapsed minutes (open spans use `nowMs` as end)
- [x] 4.2 Add `isOverrun(start: Entry, end: Entry | null, maxMinutes: number, nowMs: number): boolean` pure helper to `lib/spans.ts`
- [x] 4.3 Write unit tests in `lib/spans.test.ts` for both helpers

## 5. Closed Overrun Styling

- [x] 5.1 Pass the series `maxDurationMinutes` down to `components/entries/paired-span-item.tsx` (or wherever closed durations are rendered)
- [x] 5.2 Use `isOverrun` in `paired-span-item.tsx` to conditionally apply `text-red-600 dark:text-red-400` to the duration display element

## 6. Open Overrun Indicator

- [x] 6.1 Pass the series `maxDurationMinutes` and current time down to `components/entries/open-start-item.tsx`
- [x] 6.2 Use `isOverrun` in `open-start-item.tsx` to conditionally render a small `animate-pulse bg-red-500` dot indicator next to the open duration entry

## 7. Foreground Overrun Notification

- [x] 7.1 Create `lib/overrun-notifier.ts` with a `checkOverruns(series: Series, entries: Entry[], nowMs: number): void` function that: - finds open spans exceeding `maxDurationMinutes` - checks `localStorage` key `overrun:<seriesId>:<startEntryId>` for deduplication - calls `new Notification(...)` if `Notification.permission === 'granted'` and not yet notified - sets the `localStorage` key after firing
- [x] 7.2 Add a `clearOverrunFlag(seriesId: string, startEntryId: string): void` export to `lib/overrun-notifier.ts` that removes the localStorage key
- [x] 7.3 Write unit tests for the deduplication logic in `lib/overrun-notifier.test.ts` (mock `localStorage` and `Notification`)
- [x] 7.4 Wire `checkOverruns` into a `setInterval` (60-second tick) in the series-detail page or a suitable client component; call `clearOverrunFlag` when a span is closed

## 8. Background Overrun Notification API

- [x] 8.1 Create `app/api/notify-overrun/route.ts` as a GET handler that: - requires an authenticated session (return 401 otherwise) - fetches all series with `maxDurationMinutes` set and their entries - returns JSON array of `{ seriesId, seriesTitle, startEntryId, elapsedMinutes }` for each overrun open duration
- [x] 8.2 Add i18n strings for the notification title/body to `lib/i18n/en.ts` if needed (can reuse series title)

## 9. Service Worker — Background Sync

- [x] 9.1 Add a `periodicsync` event listener to `public/sw.js` that calls `fetch('/api/sync')` when the tag is `tidatra-sync`
- [x] 9.2 In the same `periodicsync` handler, call `fetch('/api/notify-overrun')` and for each returned overrun show a `self.registration.showNotification(...)` using the series title
- [x] 9.3 Silently handle non-2xx responses (401, 503) and network errors in the SW handler

## 10. Periodic Background Sync Registration

- [x] 10.1 In `components/pwa/service-worker-register.tsx`, after SW registration, call `registration.periodicSync.register('tidatra-sync', { minInterval: 1800000 })` guarded by `'periodicSync' in registration` and only when the user is authenticated
- [x] 10.2 Add `periodic-background-sync` to the manifest permissions policy in `app/manifest.ts` if required by the browser

## 11. Lint & Tests

- [x] 11.1 Run `pnpm lint` and fix any type or lint errors introduced by the new fields and components
- [x] 11.2 Run `pnpm test` and confirm all tests pass (including the new ones added in tasks 4.3 and 7.3)
