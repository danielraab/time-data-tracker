## Context

`SyncProvider` in `lib/db/sync-context.tsx` currently syncs on:

- login (userId transition `null → value`)
- browser coming back online (`window.addEventListener("online", …)`)
- any local PouchDB write (debounced 2 s)

There is no time-based periodic trigger. The `max-duration-pwa-sync` change is
planning to add a Periodic Background Sync (PBS) handler in the service worker,
but PBS is a Chromium-only API. Firefox (and Safari) users with a long-lived tab
get no periodic pull of changes made from other devices unless they make a local
write.

The sync mechanism as a whole now has the re-entrancy guard added by
`sync-in-progress-guard`, so a periodic timer calling `trigger()` is safe.

## Goals / Non-Goals

**Goals:**

- Add a `setInterval` timer inside `SyncProvider` that fires `trigger()` every
  5 minutes when the user is signed in. Works in all browsers.
- Align the PBS `minInterval` (from `max-duration-pwa-sync`) to the same 5-minute
  value by updating the spec and the planned implementation constant.
- Export the interval constant (`SYNC_INTERVAL_MS`) so both `SyncProvider` and
  the PBS registration share the same value without hardcoding.

**Non-Goals:**

- Implementing the PBS handler itself (owned by `max-duration-pwa-sync`).
- Syncing when the user is not authenticated (timer is cleared on logout).
- Adaptive intervals (e.g., shorter when data changes are frequent).
- Background tabs — `setInterval` is suppressed by browsers after ~1 min in
  hidden tabs; that case is covered by PBS on Chromium or is acceptable latency.

## Decisions

### D1 — `setInterval` inside `SyncProvider`, not a separate hook

**Decision**: Add the interval directly inside the existing `SyncProvider`
`useEffect` block alongside the login/online triggers.

**Rationale**: `SyncProvider` already owns all sync trigger logic. Keeping it
there avoids splitting concern across files and means the interval is
automatically cleared when the component unmounts.

**Alternative considered**: A standalone `usePeriodicSync` hook — rejected as
unnecessary abstraction for a single call site.

### D2 — Call `trigger()` directly, not `runSync()`

**Decision**: The interval callback calls `trigger()`, the same function used by
all other triggers.

**Rationale**: `trigger()` already handles the "no userId" guard, the
in-progress guard (from `sync-in-progress-guard`), and state transitions.
Calling `runSync()` directly would bypass those guards.

### D3 — Shared `SYNC_INTERVAL_MS` constant

**Decision**: Export `SYNC_INTERVAL_MS = 300_000` (5 min) from
`sync-context.tsx`. The PBS registration in `pwa/service-worker-register.tsx`
imports it and uses it as the `minInterval` argument.

**Rationale**: A single source of truth prevents the two mechanisms drifting.

**Alternative considered**: A separate `lib/sync-constants.ts` — rejected as
over-engineering for one constant.

### D4 — Timer reset when `userId` changes

**Decision**: The `useEffect` that creates the interval depends on `[trigger,
userId]` (same as the changes listener). When `userId` becomes `null` (logout),
the effect cleans up the interval automatically via its return function.

**Rationale**: Prevents the timer from firing after logout.

## Risks / Trade-offs

| Risk                                                                       | Mitigation                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Timer fires while a sync is already running                                | `syncInProgressRef` guard in `trigger()` makes it a no-op; safe to call                               |
| `setInterval` throttled in hidden tabs (browsers clamp to ~1 min or pause) | Acceptable — background case is already handled by PBS on Chromium; other browsers accept the latency |
| 5-min PBS `minInterval` is a browser hint, not a guarantee                 | Browsers may fire less frequently; `setInterval` in the foreground compensates                        |
| Interval not cleared if `SyncProvider` unmounts mid-tick                   | `useEffect` cleanup runs synchronously on unmount, clearing the interval before the next tick         |
