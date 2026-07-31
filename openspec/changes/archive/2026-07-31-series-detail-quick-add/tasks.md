## 1. Open-duration state

- [x] 1.1 In `components/series/series-detail.tsx`, import `openStarts` from `@/lib/spans` (alongside the existing `sumDurationsForDay` import).
- [x] 1.2 Derive `openStartId` via `useMemo(() => openStarts(entries)[0]?._id ?? null, [entries])`.

## 2. Quick-add handlers

- [x] 2.1 Import `createEntry` from `@/lib/db/entries-repo`, `useSyncContext` from `@/lib/db/sync-context`, and `toast` from `sonner`.
- [x] 2.2 Add `CircleDot, Play, Square` to the existing `lucide-react` import.
- [x] 2.3 Call `const { trigger: syncNow } = useSyncContext();`.
- [x] 2.4 Add `addPoint`, `startDuration`, `endDuration` async handlers mirroring `components/dashboard/series-card.tsx`'s handlers (same `createEntry` payload shapes, `syncNow()`, `toast.success(...)` with the matching `t.dashboard.quickAdd*` strings), but without `useLongPress`/`consumeLongPress` — plain `onClick`.

## 3. Buttons

- [x] 3.1 In the entries section header's right-side `flex items-center gap-2` container (`series-detail.tsx`), insert the Point and Start Duration icon buttons (`size="icon-sm" variant="ghost"`) before the existing "Add entry" button, gated on `!series.isArchived`.
- [x] 3.2 Insert the End Duration icon button in the same position, additionally gated on `openStartId` being non-null.
- [x] 3.3 Confirm button order renders as: Show on map (if any) → Point → Start Duration → End Duration (if open) → Add entry, with Add entry remaining rightmost.

## 4. Verification

- [x] 4.1 `pnpm lint`.
- [x] 4.2 Manually verify in the browser: tapping each button creates the expected entry type, End Duration only appears when a duration is open and disappears once closed, buttons are hidden on an archived series, and the row layout holds up on a narrow viewport.
