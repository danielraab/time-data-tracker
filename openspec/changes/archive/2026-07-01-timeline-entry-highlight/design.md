## Context

The previous change (`entry-jump-to-timeline`) wired entry row clicks to `Timeline.jumpTo(isoTimestamp)` via an imperative ref. The Timeline already identifies lane elements by ID: spans use `s.id` (= `start._id`), points and orphan ends use `entry._id`. The `onEntryFocus` callback currently carries only a timestamp; the Timeline has no way to know which element to highlight without the ID.

## Goals / Non-Goals

**Goals:**
- After a `jumpTo` call, briefly highlight the matching lane element for ~1.5 s then clear automatically.
- Clear the highlight immediately when the user navigates to a different day (prev/next/today/swipe).

**Non-Goals:**
- Persistent "selected" state — this is attention-drawing feedback, not selection.
- CSS keyframe animations (class-swap + Tailwind `transition` is sufficient).
- Highlighting entries that span multiple days from both day views simultaneously.

## Decisions

### Extend `jumpTo` with optional `highlightId`

`TimelineHandle.jumpTo(isoTimestamp: string, highlightId?: string): void`

The caller passes the entry ID it wants highlighted. Timeline stores `highlightedId` as `useState<string | null>(null)` and a `highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)`.

Inside `jumpTo`: cancel any pending timeout, set `highlightedId`, schedule clear after 1500 ms.

Alternative considered — timestamp matching: fragile when two entries share a millisecond; ID matching is O(1) and unambiguous.

### Clear on day navigation

`goPrev`, `goNext`, `goToday`, and the swipe handler all call `setHighlightedId(null)` before or alongside `setDayOffset`. This prevents a stale highlight appearing on the new day if another entry coincidentally shares the same ID (impossible, but defensive).

### ID mapping per entry type

| Clicked item | `highlightId` passed | Matches in Timeline |
|---|---|---|
| PointItem | `entry._id` | `visiblePoints[i]._id` |
| PairedSpanItem | `start._id` | `visibleSpans[i].id` (= `start._id`) |
| OpenStartItem | `entry._id` | `visibleSpans[i].id` (= `start._id`, since entry IS the start) |
| OrphanEndItem | `entry._id` | `visibleOrphans[i]._id` |

### Visual treatment

Spans (closed): `ring-2 ring-primary/70 border-primary bg-primary/35`  
Spans (open): `ring-2 ring-amber-500/70 border-amber-500 bg-amber-400/50`  
Points: dot `size-2 → size-3`, add `ring-1 ring-primary/70`  
Orphan ends: dot `size-2 → size-3`, add `ring-1 ring-amber-500/70`  

All transitions smoothed with Tailwind `transition-all duration-150` on the relevant elements.

## Risks / Trade-offs

- **Timeout leak on unmount** → `useEffect` cleanup cancels `highlightTimeoutRef.current` on unmount.
- **Rapid clicks** → each `jumpTo` cancels the previous timeout before scheduling a new one, so the timer always resets to 1.5 s from the last click.
- **Entry not visible on target day** → if the entry's timestamp falls outside the displayed day (e.g. a span that started 2 days ago and is still open), `highlightedId` is set but no element matches it — silent no-op, highlight times out naturally.
