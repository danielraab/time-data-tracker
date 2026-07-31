## Why

The dashboard already offers one-tap "add point / start duration / end duration" buttons on each `SeriesCard`, but a user who has drilled into a series's detail page has no equivalent shortcut — they must open the full "Add entry" dialog even for the common case of logging a point or toggling a duration. Bringing the same quick actions to the series detail view removes that extra friction for the view where users spend the most time actively tracking a series.

## What Changes

- Add three quick-add icon buttons (Point, Start Duration, End Duration) to the series detail view's entry-list header, to the left of the existing "Add entry" button.
- End Duration only renders when the series currently has an open (unclosed) duration.
- Each button creates the entry immediately on tap (no long-press-to-label affordance in this change — that remains a dashboard-only behavior per `quick-add-long-press`).
- Buttons are hidden when the series is archived, matching the existing "Add entry" button's visibility rule.
- Successful taps trigger a sync and a success toast, consistent with the dashboard quick-add buttons.

## Capabilities

### New Capabilities
- `series-detail-quick-add`: One-tap point/start-duration/end-duration actions available directly on the series detail page's entry list header.

### Modified Capabilities
(none — this does not change the behavior of the existing dashboard quick-add or long-press capabilities)

## Impact

- `components/series/series-detail.tsx`: add the three buttons, handlers, and local derivation of "has open duration" state from the already-loaded `entries`.
- No changes to `lib/db/entries-repo.ts`, `lib/spans.ts`, or `lib/db/sync-context.tsx` — all reused as-is.
- No new files, no prop/API changes to `SeriesDetail` or its parent page.
