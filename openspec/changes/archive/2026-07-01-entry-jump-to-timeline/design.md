## Context

`Timeline` is a self-contained client component that owns its own `dayOffset` state and manages day navigation (prev/next/today buttons, swipe gestures). It has an existing `useEffect` that auto-scrolls the viewport when the day changes. `EntryList` renders entry rows with edit/delete/map buttons but no link back to the timeline position.

The two components are siblings inside `SeriesDetail`, with no shared navigation state.

## Goals / Non-Goals

**Goals:**
- Clicking an entry row navigates the Timeline to that entry's day and scrolls to the entry's timestamp.
- Existing buttons (edit, delete, map, unlink) keep their current behavior.

**Non-Goals:**
- Entry list does not follow timeline navigation (reverse direction, deferred).
- No smooth-scroll animation (instant is correct when the day is changing simultaneously).

## Decisions

### Imperative ref over lifted state

`Timeline` exposes a `jumpTo(isoTimestamp: string)` method via `useImperativeHandle`. `SeriesDetail` holds a `useRef<TimelineHandle>` and calls it when an entry is clicked.

Alternatives considered:
- **Lift `dayOffset` to `SeriesDetail`**: Requires threading `dayOffset`, `onDayOffsetChange`, and a `focusTimestampMs` prop into Timeline, plus `SeriesDetail` forwarding all nav callbacks. More surface area for a focused feature.
- **URL / query-param state**: Overkill; day navigation is ephemeral UI state, not a shareable URL concern.

`useImperativeHandle` is the React-recommended escape hatch for "focus/scroll" commands. It keeps Timeline's internal nav state intact.

### Pending scroll ref for cross-effect coordination

`jumpTo` stashes the target millisecond in a `pendingScrollMs` React ref (not state), then calls `setDayOffset`. When the scroll `useEffect` fires on the next render, it reads and clears `pendingScrollMs`, using it as `targetY` instead of the default "center earliest entry / now" logic.

This avoids adding a second `useEffect` or a derived state value that could cause race conditions with the existing scroll logic.

### Clickable full row with stopPropagation on buttons

Each `<li>` row becomes clickable (`onClick` + `cursor-pointer` hover). All action buttons call `e.stopPropagation()` so they don't also trigger the row click.

Alternative: clickable timestamp text only — less target area, harder to discover.

### Timestamp to use per entry type

| Type | Scroll target |
|---|---|
| `point_label` / `point_number` | `entry.timestamp` |
| paired span | `start.timestamp` (where the duration begins) |
| open start | `start.timestamp` |
| orphan end | `entry.timestamp` |

## Risks / Trade-offs

- **`pendingScrollMs` is a ref, not state**: If a re-render is triggered between `setDayOffset` and the effect firing for an unrelated reason, the ref is still read correctly on the first effect execution. Low risk.
- **Items in editing mode**: When a row is in edit mode, clicking inside form inputs/buttons should not trigger `jumpTo`. `stopPropagation` on the save/cancel/unlink buttons handles this; inputs naturally don't bubble click to `<li>` in a way that conflicts.
