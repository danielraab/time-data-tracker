## 1. Extend the onEntryFocus callback signature

- [x] 1.1 Update `EntryListProps.onEntryFocus` type from `(isoTimestamp: string) => void` to `(isoTimestamp: string, entryId: string) => void`
- [x] 1.2 `PointItem`: add `entryId` arg — change call to `onEntryFocus?.(entry.timestamp, entry._id)`
- [x] 1.3 `PairedSpanItem`: change call to `onEntryFocus?.(start.timestamp, start._id)`
- [x] 1.4 `OpenStartItem`: change call to `onEntryFocus?.(entry.timestamp, entry._id)`
- [x] 1.5 `OrphanEndItem`: change call to `onEntryFocus?.(entry.timestamp, entry._id)`
- [x] 1.6 `SeriesDetail`: update handler to `(ts, id) => timelineRef.current?.jumpTo(ts, id)`

## 2. Timeline: highlightedId state and timeout management

- [x] 2.1 Add `highlightedId` state: `const [highlightedId, setHighlightedId] = useState<string | null>(null)`
- [x] 2.2 Add `highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)`
- [x] 2.3 Extend `TimelineHandle.jumpTo` signature to `jumpTo(isoTimestamp: string, highlightId?: string): void`
- [x] 2.4 Inside `jumpTo`: cancel previous timeout (`clearTimeout(highlightTimeoutRef.current)`), call `setHighlightedId(highlightId ?? null)`, schedule clear: `highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1500)`
- [x] 2.5 Add `useEffect` cleanup to cancel timeout on unmount: `return () => clearTimeout(highlightTimeoutRef.current ?? undefined)`
- [x] 2.6 Call `setHighlightedId(null)` in `goPrev`, `goNext`, `goToday`, and the swipe handler (`handleTouchEnd`)

## 3. Timeline: highlight rendering

- [x] 3.1 Add `transition-all duration-150` to each span `<div>` in the lane; apply `ring-2 ring-primary/70 border-primary bg-primary/35` when `s.id === highlightedId` (closed spans), `ring-2 ring-amber-500/70 border-amber-500 bg-amber-400/50` when open span highlighted
- [x] 3.2 Add `transition-all duration-150` to each point dot `<span>`; apply `size-3 ring-1 ring-primary/70` instead of `size-2` when `entry._id === highlightedId`
- [x] 3.3 Add `transition-all duration-150` to each orphan-end dot `<span>`; apply `size-3 ring-1 ring-amber-500/70` instead of `size-2` when `entry._id === highlightedId`

## 4. Lint and verify

- [x] 4.1 Run `pnpm lint` and fix any TypeScript or ESLint errors
