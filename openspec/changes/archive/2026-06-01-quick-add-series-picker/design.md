## Context

The Quick Add card (`components/dashboard/quick-add.tsx`) exposes one-tap entry creation for the series currently marked `isDefault`. The series label is rendered as a `<Link>` that navigates to the series detail page. `setDefaultSeries` already exists in `lib/db/series-repo.ts` and `useSeriesList` in `lib/db/hooks.ts`, so all data-layer primitives are in place. The project uses shadcn/ui and already has a `<DropdownMenu>` component.

## Goals / Non-Goals

**Goals:**

- Replace the series `<Link>` in Quick Add with a dropdown trigger that lists all non-archived series.
- Selecting a series calls `setDefaultSeries`, immediately updating the Quick Add target.
- The series title still navigates to the detail page (via a secondary affordance — a small external-link icon or keeping the link inside the dropdown item).
- Works fully offline (PouchDB-only, no network calls).

**Non-Goals:**

- Creating or archiving series from the picker.
- Changing how the default series is stored; no data-model changes.
- Adding a dedicated settings page for the default series.

## Decisions

### Use shadcn/ui `<DropdownMenu>` as the picker

**Decision:** Use the existing `DropdownMenu` component (already in `components/ui/dropdown-menu.tsx`) rather than a custom `<select>` or a Popover/Combobox.

**Rationale:** The series list is typically short (< 20 items). A dropdown is the simplest matching component already available in the project. A Combobox with search would be appropriate if the list could grow large, but that adds significant complexity for a feature where users are unlikely to have dozens of series.

**Alternative considered:** shadcn/ui `<Popover>` + `<Command>` (Combobox) — rejected as over-engineered for the expected series count. Can be revisited if filtering becomes necessary.

### Keep the series link accessible

**Decision:** Inside each dropdown item, render the series title as the selectable action plus a small `<Link>` icon that navigates to the series detail page.

**Rationale:** The original affordance was a direct link to the series. Removing it entirely would regress navigability. Placing the nav link inside the item keeps the picker compact without losing the drill-down path.

### Optimistic UI — no loading spinner during switch

**Decision:** Call `setDefaultSeries` and let the live PouchDB subscription in `useDefaultSeries` pick up the change automatically. No extra loading state is needed.

**Rationale:** `setDefaultSeries` is a local PouchDB write (fast). The `useLive` hook in `hooks.ts` re-runs on every db change, so the title updates reactively with no manual state management.

## Risks / Trade-offs

- **Many series performance** → Rendering all series in a dropdown menu is fine up to ~50 items; beyond that it could feel slow. Mitigation: acceptable for v1; a Combobox can replace the DropdownMenu later.
- **Race condition on rapid switching** → Calling `setDefaultSeries` multiple times quickly could interleave PouchDB bulk writes. Mitigation: disable the picker items while a switch is in-flight (brief `isPending` state).
