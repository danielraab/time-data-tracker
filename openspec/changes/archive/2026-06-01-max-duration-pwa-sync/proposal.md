## Why

Series tracking often involves durations that should stay within a defined limit (e.g., work sessions, exercise intervals). Currently there is no way to enforce or visualize these limits, and the PWA only syncs data when the app is in the foreground. This change adds background sync and a max-duration feature so users receive timely alerts and can easily spot overrun durations.

## What Changes

- PWA service worker gains a periodic background sync that fires every 30 minutes to push/pull data with CouchDB even when the app is not open.
- Series gain an optional `maxDurationMinutes` field that can be set when creating or editing a series.
- When an open duration (started but not yet ended) on a series crosses the configured max duration, the PWA sends a browser notification to the user.
- Closed durations that exceed `maxDurationMinutes` are rendered in red.
- Open durations that exceed `maxDurationMinutes` display a discrete red blinking indicator.

## Capabilities

### New Capabilities
- `pwa-background-sync`: Periodic Background Sync registration in the service worker; syncs PouchDB↔CouchDB every 30 minutes while the user is authenticated.
- `series-max-duration`: Optional `maxDurationMinutes` field on a series; UI controls in series create/edit form; red styling for closed overrun durations; discrete red-blinking indicator for open overrun durations; PWA notification when an open duration crosses the threshold.

### Modified Capabilities
<!-- No existing spec-level requirements are changing. -->

## Impact

- `lib/types.ts` — add `maxDurationMinutes?: number` to the `ZeitSerie` type.
- `lib/db/series-repo.ts` — persist and read the new field.
- `components/series/series-form.tsx` — new optional numeric input for max duration.
- `public/sw.js` — register `periodicsync` handler; trigger PouchDB sync.
- `app/manifest.ts` — declare `periodic-background-sync` in `permissions_policy` / manifest permissions.
- `components/entries/entry-list.tsx` and related entry item components — conditional red/blinking styling.
- `lib/spans.ts` — helper to detect overrun durations.
- New dependency: possibly `@types/serviceworker` for typed Periodic Background Sync API.
- Browser support note: Periodic Background Sync is Chromium-only; graceful degradation required for other browsers.
