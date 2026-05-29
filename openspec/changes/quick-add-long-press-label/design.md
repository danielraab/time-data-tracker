## Context

The dashboard has two surfaces with quick-add buttons: the `QuickAdd` widget (default series) and `SeriesCard` items (all series list). Both currently use simple `onClick` handlers to fire `createEntry` immediately. There is no intermediate step — users who want a label must open the full `AddEntryDialog`.

The change adds a long-press path: holding a button for ~500 ms cancels the immediate action and opens a small modal containing only a label field. This keeps the fast path unchanged while adding expressiveness for power users.

## Goals / Non-Goals

**Goals:**

- Add long-press detection to Point and Start Duration quick-add buttons.
- Open a lightweight modal on long-press with a single optional label field.
- Submit creates the entry (point or span_start) with that label.
- Shared, reusable long-press hook so both surfaces use the same logic.
- Zero new third-party dependencies.

**Non-Goals:**

- Changing the "End Duration" button — no label needed there.
- Adding GPS, timestamp, or type selection to the quick-label modal (that is the full dialog's job).
- Long-press on any button outside the quick-add surfaces.
- Haptic/vibration feedback (nice-to-have, not in scope).

## Decisions

### 1. Long-press via pointer events (not `setTimeout` on `mousedown`)

**Decision:** Implement `useLongPress` using `onPointerDown` / `onPointerUp` / `onPointerLeave` with `setTimeout`.

**Rationale:** Pointer events work uniformly for mouse, touch, and stylus. `mousedown` alone misses touch. A 500 ms threshold is the de facto mobile standard. The hook returns `{ onPointerDown, onPointerUp, onPointerLeave }` spread props so it composes cleanly with any button.

**Alternative considered:** `react-use`'s `useLongPress` — rejected because it adds a dependency and the logic is only ~20 lines.

---

### 2. Separate `QuickLabelModal` component, not extending `AddEntryDialog`

**Decision:** Create `components/entries/quick-label-modal.tsx` as a new, minimal Dialog component.

**Rationale:** `AddEntryDialog` is complex (type switch, GPS, full timestamp). Reusing it for "just a label" would require threading many optional props and conditional rendering. A purpose-built minimal modal is simpler, easier to test, and keeps the fast path clearly separated from the full form. The modal receives `entryType` and `seriesId` as props and calls `createEntry` itself on submit.

**Alternative considered:** Pass `defaultType` with a "label-only" flag into `AddEntryDialog` — rejected because it complicates the existing component with branching logic.

---

### 3. Abort click on long-press trigger

**Decision:** In `useLongPress`, set a `isLongPress` ref and in the `onClick` handler of the button, check this ref and early-return if `true` (then reset).

**Rationale:** When the user holds long enough to open the modal, the subsequent `click` event must not also fire `addPoint`/`startDuration`. Using a ref avoids React state re-renders. The ref is reset after the click handler inspects it, so one action per gesture.

---

### 4. Long-press state lives in the quick-add components, not a global store

**Decision:** Each button (in `QuickAdd` and `SeriesCard`) tracks its own `modalOpen` state locally.

**Rationale:** The modals are ephemeral UI state tied to a specific button press. No cross-component sharing is needed. Local state keeps the components self-contained.

## Risks / Trade-offs

- **Accidental long-press on mobile** → Modal may open unexpectedly during scroll. Mitigation: cancel the timer on `onPointerMove` beyond a small drag threshold (or simply rely on `onPointerLeave` which fires when the pointer moves off the button during scroll).
- **500 ms threshold feels slow on desktop** → Acceptable; long-press is a secondary action. Users who want labels regularly should use the full dialog.
- **Duplicate logic in two components** → Mitigated by extracting `useLongPress` hook and `QuickLabelModal` as shared primitives; the two call sites only spread props and manage `modalOpen`.

## Open Questions

- Should the label field be pre-focused when the modal opens? (Recommend yes — `autoFocus` on the input.)
- Should a successful quick-label submission show a toast with the label text, or the same generic toast? (Recommend showing the label if non-empty.)
