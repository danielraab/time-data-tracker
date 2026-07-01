## 1. Timeline — expose imperative handle

- [x] 1.1 Import `forwardRef`, `useImperativeHandle`, `differenceInCalendarDays` (from date-fns) in `timeline.tsx`
- [x] 1.2 Define and export `TimelineHandle` interface with `jumpTo(isoTimestamp: string): void`
- [x] 1.3 Add `pendingScrollMs` ref (`useRef<number | null>(null)`) inside Timeline
- [x] 1.4 Implement `jumpTo`: compute dayOffset via `differenceInCalendarDays`, set `pendingScrollMs.current`, call `setDayOffset`
- [x] 1.5 Wire `useImperativeHandle(ref, () => ({ jumpTo }))` — requires converting component to `forwardRef`
- [x] 1.6 Extend the scroll `useEffect`: check `pendingScrollMs.current` first; if set, use it as `targetY` and clear the ref before the existing fallback logic

## 2. EntryList — thread onEntryFocus prop

- [x] 2.1 Add `onEntryFocus?: (isoTimestamp: string) => void` to `EntryListProps`
- [x] 2.2 Pass `onEntryFocus` down to `PointItem`, `PairedSpanItem`, `OpenStartItem`, `OrphanEndItem`

## 3. Item components — clickable rows

- [x] 3.1 `PointItem`: add `onEntryFocus?` prop, `onClick={() => onEntryFocus?.(entry.timestamp)}` + hover style on `<li>`; add `e.stopPropagation()` to edit, delete, and map buttons
- [x] 3.2 `PairedSpanItem`: add `onEntryFocus?` prop, `onClick={() => onEntryFocus?.(start.timestamp)}` + hover style on `<li>`; add `e.stopPropagation()` to edit, delete, unlink, and map buttons
- [x] 3.3 `OpenStartItem`: add `onEntryFocus?` prop, `onClick={() => onEntryFocus?.(entry.timestamp)}` + hover style on `<li>`; add `e.stopPropagation()` to all action buttons
- [x] 3.4 `OrphanEndItem`: add `onEntryFocus?` prop, `onClick={() => onEntryFocus?.(entry.timestamp)}` + hover style on `<li>`; add `e.stopPropagation()` to all action buttons

## 4. SeriesDetail — wire ref and callback

- [x] 4.1 Import `TimelineHandle` and add `const timelineRef = useRef<TimelineHandle>(null)`
- [x] 4.2 Pass `ref={timelineRef}` to `<Timeline>`
- [x] 4.3 Pass `onEntryFocus={(ts) => timelineRef.current?.jumpTo(ts)}` to `<EntryList>`

## 5. Lint and verify

- [x] 5.1 Run `pnpm lint` and fix any TypeScript or ESLint errors
