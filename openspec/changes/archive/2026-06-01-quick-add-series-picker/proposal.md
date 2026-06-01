## Why

The Quick Add section always operates on the designated "default" series, but there is no way to change that default from the dashboard without navigating away. Users who track multiple series must go to a series detail page to set a new default, breaking the fast-entry flow.

## What Changes

- The series label in the Quick Add card becomes an interactive trigger instead of a plain link.
- Clicking the label opens a dropdown listing all available series; selecting one calls `setDefaultSeries` and immediately switches the target for quick-add actions.
- The "no default series" state is unchanged; it still shows the existing message.

## Capabilities

### New Capabilities

- `quick-add-series-picker`: A dropdown affordance on the Quick Add card that lets the user switch which series receives quick-add entries, persisting the choice via `setDefaultSeries`.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- `components/dashboard/quick-add.tsx` — replaces the series `<Link>` with a dropdown trigger; adds `useSeriesList` and `setDefaultSeries` calls.
- `lib/i18n/en.ts` — new strings for the picker (aria label, empty state if needed).
- No data-model or API changes; `setDefaultSeries` already exists in `lib/db/series-repo.ts`.
