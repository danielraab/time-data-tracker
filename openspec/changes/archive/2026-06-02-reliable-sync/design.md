## Context

The "Clear data and sign out" button in `AppHeader` currently does:

```ts
destroyDb().then(() =>
  signOut({
    fetchOptions: { onSuccess: () => window.location.reload() },
  })
)
```

`destroyDb()` calls `db.destroy()` (PouchDB hard wipe) and resets the singleton
immediately. There is no sync step. Any writes accumulated since the last
completed sync — including the 2-second debounce window — are permanently lost.

The login-triggered sync in `SyncContext` already requests `since=0` when no
checkpoint exists (fresh DB), so it can recover everything that was successfully
pushed. The only gap is in the outbound direction: changes that were never
pushed.

## Goals / Non-Goals

**Goals:**

- Await a full `runSync` cycle before `destroyDb()` in the clear-and-sign-out
  handler.
- Show loading feedback in the menu item while the sync runs.
- If the sync fails, show a native `window.confirm` asking if the user wants to
  force-clear anyway (data may be lost).
- If the user cancels the confirmation, abort — data remains intact.

**Non-Goals:**

- Changing the plain "Sign out" (without clear) path — it does not touch the DB.
- Retrying a failed sync automatically — one attempt is sufficient.
- Modifying the sync mechanism itself (`runSync`, API routes, checkpoint logic).
- Timeout handling for the sync (the existing `runSync` will fail fast if the
  server is unreachable).

## Decisions

### D1 — Run sync in the click handler, not via `trigger()`

**Decision**: Call `runSync(userId)` directly in the handler rather than using
`trigger()` from `useSyncContext`.

**Rationale**: `trigger()` is fire-and-forget (no return value, no await). We
need to await the sync to know if it succeeded before proceeding with the
destroy. `runSync` is already exported from `lib/db/sync.ts`.

**Alternative considered**: Extending `trigger()` to return a Promise — rejected
as it would change the existing interface and affect all callers.

### D2 — `window.confirm` for the failure fallback

**Decision**: On sync failure, use `window.confirm` with a warning message
rather than a custom dialog component.

**Rationale**: The failure path is uncommon (user is offline at the moment of
sign-out). A native confirm is the simplest implementation with no new UI
components required. The message lives in `lib/i18n/en.ts` as usual.

**Alternative considered**: A custom modal — rejected as over-engineering for an
error edge case.

### D3 — Loading state via local React state, not `useSyncContext`

**Decision**: Add a `clearingInProgress` boolean via `useState` local to
`AppHeader`, used only to disable the menu item and show a spinner during the
pre-clear sync.

**Rationale**: The global sync state in `SyncContext` is for the main sync
indicator. The clear-and-sign-out is a one-shot operation that should not
interfere with the global indicator or trigger the auto-debounce listener.

**Alternative considered**: Calling `trigger()` and watching `syncState` — 
rejected because `trigger()` is not awaitable (see D1).

### D4 — Abort entirely if user cancels the confirm

**Decision**: If sync fails and the user answers "Cancel" to the confirm, the
handler exits with no further action. The DB is intact, the user remains signed
in.

**Rationale**: The user explicitly opted out of force-clear. Safest default is
to do nothing.

## Flow

```
user clicks "Clear data and sign out"
         │
         ▼
clearingInProgress = true  (disables button, shows spinner)
         │
         ▼
  runSync(userId)
    ├─ success ─────────────────────────────────────────────┐
    │                                                        ▼
    └─ failure ──► window.confirm(t.auth.syncFailedClear)   │
                     ├─ Cancel ──► return (abort, no clear) │
                     └─ OK ──────────────────────────────────┤
                                                             ▼
                                                       destroyDb()
                                                             │
                                                             ▼
                                                       signOut()
                                                             │
                                                             ▼
                                                  window.location.reload()
```

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Sync hangs indefinitely (slow server) | `runSync` uses native `fetch`; browser timeout applies. Acceptable. |
| User is offline — sync always fails | `window.confirm` gives escape hatch to force-clear |
| `runSync` called concurrently with debounce sync | `syncInProgressRef` in `SyncContext` is unaffected (separate call); PouchDB handles concurrent writes safely |
| `destroyDb()` called while debounce timer is pending | Timer fires after destroy on an already-dead DB — PouchDB will reject the call gracefully, the error is swallowed by the debounce's catch |
