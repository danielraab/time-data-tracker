## Why

Quick-add buttons save time by creating entries instantly, but users often want to attach a label to distinguish entries (e.g., "coffee", "headache", "gym") without opening the full add-entry dialog. Today there is no lightweight path to add a label at quick-add time — users either forgo labels or navigate to the full form.

## What Changes

- Single click on quick-add "Point" and "Start Duration" buttons continues to create an unlabelled entry immediately (no behaviour change).
- A long press (pointer held for ~500 ms) on those same buttons opens a small inline modal asking only for an optional label; submitting creates the entry with that label.
- The long-press modal is intentionally minimal: one text field, a submit button, and a cancel action. No timestamp, GPS, or type selection (those remain in the full dialog).
- The long-press behaviour is added to both locations that expose quick-add buttons:
  - The default-series `QuickAdd` widget on the dashboard.
  - The per-series `SeriesCard` list items on the dashboard.
- "End Duration" buttons are **not** changed — ending a span does not benefit from a label at this point.

## Capabilities

### New Capabilities

- `quick-add-long-press`: Long-press gesture on quick-add Point and Start Duration buttons that opens a lightweight label-entry modal and creates the entry with the supplied label on confirm.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- `components/dashboard/quick-add.tsx` — add long-press hook and modal trigger to Point and Start Duration buttons.
- `components/dashboard/series-card.tsx` — same additions for the card-level quick-add buttons.
- New shared component `components/entries/quick-label-modal.tsx` (or similar) — the minimal label modal.
- New shared hook `lib/use-long-press.ts` — reusable pointer-event-based long-press detection.
- `lib/i18n/en.ts` — new strings for the modal (title, label placeholder, submit, cancel).
- No new dependencies required; uses existing Dialog/Button/Input primitives.
