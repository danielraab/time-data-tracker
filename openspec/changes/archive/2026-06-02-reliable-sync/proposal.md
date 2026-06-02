## Why

Two sync reliability gaps have been identified in the current implementation:

1. **"Clear data and sign out" discards unsynced changes.** When the user clicks
   the destructive sign-out button, `destroyDb()` is called immediately —
   before any sync runs. Any writes made since the last completed sync cycle
   (including the 2-second debounce window) are permanently lost. The server
   never learns about them.

2. **Login pull is incremental, not authoritative.** On fresh login after a
   clear, the checkpoint is gone, so the pull requests `since=0` (all docs).
   However this only recovers data that was successfully pushed _before_ the
   clear. It cannot recover data that was never pushed.

Together these gaps mean: make a change, click "Clear data and sign out",
log back in → the change is gone.

## What Changes

- **Sync-before-clear**: The "Clear data and sign out" flow runs a sync cycle
  to completion before calling `destroyDb()`. If the sync fails (e.g. offline),
  the user sees a warning and gets a choice to abort or force-clear.
- **Sync-on-login guarantee**: The login-triggered sync already pulls `since=0`
  on a clean slate — no change needed here. The fix is entirely in the
  sign-out-and-clear path.
- **UI feedback during pre-clear sync**: A loading state is shown while the sync
  runs so the user knows the operation is in progress.

## Capabilities

### Modified Capabilities

- `sync-before-clear`: Before `destroyDb()` is called in the "Clear data and
  sign out" handler, a sync cycle is awaited. If it succeeds, the destroy
  proceeds. If it fails, a confirmation dialog is presented.

## Impact

- `components/app-header.tsx` — replace the `destroyDb().then(signOut)`
  chain with an async handler that awaits `runSync` first.
- `lib/db/sync.ts` — `runSync` is already exported; no changes needed there.
- `lib/i18n/en.ts` — one new string for the "sync failed, force clear?"
  confirmation message.
- No changes to the API routes, PouchDB schema, or CouchDB model.
- No new dependencies.
