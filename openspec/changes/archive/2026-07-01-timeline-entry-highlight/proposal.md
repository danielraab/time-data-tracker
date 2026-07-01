## Why

After clicking an entry row the timeline jumps to the right day and scrolls, but there is no visual feedback identifying *which* element in the lane was clicked. On a busy day with many entries, the user has to scan the timeline to find it.

## What Changes

- The `onEntryFocus` callback is extended to carry the entry ID as a second argument, so the Timeline knows which lane element to highlight.
- The Timeline shows a brief flash-and-fade highlight (~1.5 s) on the span, point, or orphan-end element that corresponds to the clicked entry.
- Highlight clears automatically when the user navigates to a different day.
- **BREAKING** (internal): `onEntryFocus` signature changes from `(isoTimestamp: string)` to `(isoTimestamp: string, entryId: string)` — affects EntryList, all four item components, and SeriesDetail.

## Capabilities

### New Capabilities

- `timeline-entry-highlight`: The Timeline briefly highlights the lane element (span, point, or orphan end) that corresponds to the entry clicked in the entry list.

### Modified Capabilities

- `entry-timeline-focus`: `onEntryFocus` now also carries `entryId` so the highlight can identify the correct lane element.

## Impact

- `components/timeline/timeline.tsx` — `TimelineHandle.jumpTo` gains optional `highlightId`; add `highlightedId` state + timeout ref; apply conditional classes to span/point/orphan-end elements; clear on day navigation
- `components/entries/entry-list.tsx` — update `onEntryFocus` prop signature
- `components/entries/point-item.tsx` — pass `entry._id` as second arg
- `components/entries/paired-span-item.tsx` — pass `start._id` as second arg
- `components/entries/open-start-item.tsx` — pass `entry._id` as second arg
- `components/entries/orphan-end-item.tsx` — pass `entry._id` as second arg
- `components/series/series-detail.tsx` — forward second arg to `jumpTo`
