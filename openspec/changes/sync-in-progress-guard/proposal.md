## Why

When a sync completes and the pull step writes docs into the local PouchDB, the
live `changes` listener fires change events for every written doc, scheduling
another unnecessary sync. With clock skew the echoed sync can even push docs
back to the server, burning network traffic on each mutation. The bug is subtle
but measurable with large datasets or the background-sync path introduced by the
PWA work.

## What Changes

- Add a boolean `syncInProgress` ref inside `SyncProvider` that is set to `true`
  for the duration of any `runSync` call and cleared on completion or error.
- Guard the `changes` listener callback: if `syncInProgress` is `true`, skip
  scheduling the debounced trigger.
- This removes the systematic "echo" sync that currently fires after every pull
  that returns at least one doc.
- No changes to `runSync` itself, the API routes, or PouchDB schemas.

## Capabilities

### New Capabilities

- `sync-loop-guard`: A re-entrancy guard that prevents a sync run from triggering
  a follow-on sync via the PouchDB changes listener.

### Modified Capabilities

<!-- none -->

## Impact

- `lib/db/sync-context.tsx` — the only file changed.
- No API surface changes; no new dependencies.
- Existing `sync.test.ts` tests unaffected (they test `runSync` in isolation).
- A new unit test should cover the guard logic in `SyncProvider`.
