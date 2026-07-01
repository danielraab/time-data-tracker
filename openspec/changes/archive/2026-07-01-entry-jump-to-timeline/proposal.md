## Why

The entry list and timeline are side-by-side views of the same data, but clicking an entry in the list gives no way to locate it on the timeline. Users must manually navigate the timeline day-by-day to find the entry they are looking at in the list.

## What Changes

- Clicking an entry row in the entry list navigates the Timeline to that entry's day and scrolls the viewport to the entry's timestamp.
- All existing action buttons (edit, delete, map, unlink) continue to work and do not trigger navigation.

## Capabilities

### New Capabilities

- `entry-timeline-focus`: Clicking an entry row in the entry list causes the Timeline to jump to that entry's day and scroll to the relevant timestamp.

### Modified Capabilities

<!-- none -->

## Impact

- `components/timeline/timeline.tsx` — expose imperative `jumpTo` handle via `forwardRef` / `useImperativeHandle`
- `components/entries/entry-list.tsx` — add `onEntryFocus` callback prop, thread to item components
- `components/entries/point-item.tsx` — clickable row, stopPropagation on action buttons
- `components/entries/paired-span-item.tsx` — clickable row, stopPropagation on action buttons
- `components/entries/open-start-item.tsx` — clickable row, stopPropagation on action buttons
- `components/entries/orphan-end-item.tsx` — clickable row, stopPropagation on action buttons
- `components/series/series-detail.tsx` — wire `timelineRef` and pass `onEntryFocus` to `EntryList`
