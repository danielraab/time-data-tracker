## 1. Shared Primitives

- [x] 1.1 Create `lib/use-long-press.ts` — hook accepting a `threshold` (default 500 ms) that returns `{ onPointerDown, onPointerUp, onPointerLeave }` spread props and an `isLongPress` ref consumed by click handlers to suppress the immediate action
- [x] 1.2 Add i18n strings to `lib/i18n/en.ts` for the quick-label modal: title, label placeholder, submit button, cancel button, and labelled/unlabelled success toasts
- [x] 1.3 Create `components/entries/quick-label-modal.tsx` — minimal Dialog with a single label `Input`, submit and cancel `Button`s; accepts `open`, `onOpenChange`, `seriesId`, and `entryType` props; calls `createEntry` on submit and shows a toast

## 2. QuickAdd Widget

- [x] 2.1 Spread `useLongPress` props onto the "Point" button in `components/dashboard/quick-add.tsx`; add `modalOpen` / `modalType` state; guard `addPoint` onClick with the `isLongPress` ref
- [x] 2.2 Spread `useLongPress` props onto the "Start Duration" button in `QuickAdd`; guard `startDuration` onClick likewise; render `<QuickLabelModal>` for the widget

## 3. SeriesCard Buttons

- [x] 3.1 Spread `useLongPress` props onto the "Point" button in `components/dashboard/series-card.tsx`; add local `modalOpen` / `modalType` state; guard `addPoint` onClick
- [x] 3.2 Spread `useLongPress` props onto the "Start Duration" button in `SeriesCard`; guard `startDuration` onClick; render `<QuickLabelModal>` for the card

## 4. Tests

- [x] 4.1 Write `lib/use-long-press.test.ts` — unit tests for the hook: long-press fires callback, short press does not, pointer-leave cancels timer
- [x] 4.2 Write `components/entries/quick-label-modal.test.ts` — extract and test any pure helper (e.g., toast message builder) from the modal component

## 5. Lint & Cleanup

- [x] 5.1 Run `pnpm lint` and fix any issues
- [x] 5.2 Verify `pnpm test` passes with new test files included
