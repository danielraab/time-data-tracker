## Context

`components/dashboard/series-card.tsx` already implements one-tap point/start/end-duration actions, including long-press-to-label (see `quick-add-long-press` capability). The series detail page (`components/series/series-detail.tsx`) has no such shortcut today — only the full `AddEntryDialog` via the "Add entry" button. `SeriesDetail` already loads `entries` via `useEntries(id)`, but derives no "open duration" state from them (that derivation currently only happens for the dashboard's series list).

## Goals / Non-Goals

**Goals:**
- Reuse the exact same entry-creation pattern (`createEntry` + `syncNow` + toast) already proven in `series-card.tsx`.
- Keep the change confined to `series-detail.tsx` — no prop/API changes to the component or its parent page.
- Preserve existing button order/visibility rules: hidden when `series.isArchived`, "Add entry" stays the rightmost button.

**Non-Goals:**
- Long-press-to-label on these buttons. `quick-add-long-press` scopes that behavior to the dashboard `QuickAdd` widget and `SeriesCard` only; extending it to a third surface is a separate, later decision if wanted.
- Any change to `createEntry`, `lib/spans.ts`, or `lib/db/sync-context.tsx`.

## Decisions

- **Derive open-duration state locally via `useMemo`**, using `openStarts(entries)` from `lib/spans.ts` (already used elsewhere for this exact purpose), rather than threading it down from a parent — `entries` is already in scope in `SeriesDetail`, so no new data fetching is needed. Alternative considered: compute in `app/series/[id]/page.tsx` and pass as a prop — rejected, since `entries` isn't loaded there and it would add prop surface for no benefit.
- **No long-press wrapper.** Plain `onClick` handlers, mirroring `series-card.tsx`'s handlers minus the `consumeLongPress` guard and the `useLongPress` hook. Keeps the diff minimal per explicit scope decision.
- **Insert into the existing right-side flex container** (`series-detail.tsx`'s header row, `flex items-center gap-2`) ahead of the "Add entry" button, rather than creating a new row or container — matches the "aligned right, Add entry stays rightmost" requirement with zero layout changes.

## Risks / Trade-offs

- [Divergence between `series-card.tsx` and `series-detail.tsx` entry-creation logic] → Both call the same `createEntry` helper with the same payload shapes; only the UI wiring (long-press vs. plain tap) differs, so behavior stays consistent even though the code isn't shared as a hook. If a third surface needs this later, worth extracting a shared hook then.
- [Icon row crowding on narrow viewports] → The three new icon buttons use the same compact `icon-sm` sizing as the dashboard; the header already wraps "Show on map" conditionally in the same row, so verify on a small viewport during implementation.
