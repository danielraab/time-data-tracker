## Why

The planned `max-duration-pwa-sync` change introduces Periodic Background Sync
(PBS) to keep TiDaTra data fresh — but PBS is a Chromium-only API. Firefox and
Safari users get no periodic sync at all unless the tab is open and happens to
write data. Additionally, even for Chromium users the planned 30-minute interval
is too coarse for active use: a user at their desk with the tab open should see
changes from other devices much sooner. This change adds a foreground `setInterval`
that fires every 5 minutes while the app is open (covering all browsers), and
reduces the PBS `minInterval` to 5 minutes for Chromium background sync.

## What Changes

- `SyncProvider` (`lib/db/sync-context.tsx`) gains a `setInterval` timer that
  calls `trigger()` every 5 minutes when the user is signed in. Cleared on
  logout or unmount.
- The `AUTO_SYNC_INTERVAL_MS` constant (5 minutes) is shared and exported so
  the PBS registration can use the same value.
- `pwa-background-sync` spec: the `minInterval` in the PBS registration is
  updated from 1 800 000 ms (30 min) to 300 000 ms (5 min).
- No new dependencies. No API changes.

## Capabilities

### New Capabilities

- `foreground-periodic-sync`: A `setInterval`-based sync that fires every 5
  minutes while the user is authenticated and the tab is open. Works in all
  browsers (Firefox, Safari, Chromium).

### Modified Capabilities

- `pwa-background-sync`: The `minInterval` for Periodic Background Sync
  registration changes from 1 800 000 ms to 300 000 ms (5 minutes), aligning
  background and foreground sync cadences.

## Impact

- `lib/db/sync-context.tsx` — add interval timer; export the interval constant.
- `openspec/changes/max-duration-pwa-sync/specs/pwa-background-sync/spec.md` —
  the `minInterval` value in the existing spec will need updating before that
  change is implemented.
- No changes to `runSync`, the API routes, or PouchDB schemas.
- The interval is independent of the existing debounce-on-write trigger, so
  write-heavy sessions are unaffected.
