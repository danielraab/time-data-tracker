## Context

`SyncProvider` in `lib/db/sync-context.tsx` subscribes to the PouchDB live
changes feed. When `runSync` completes its pull step it writes pulled docs into
the local database. Those writes fire change events, which the listener picks up
and schedules a debounced re-trigger — causing one unnecessary "echo" sync after
every pull that returns data. With clock skew the echo sync can even push docs
back to the server before the server's LWW logic discards them.

The fix is surgical: a `useRef` boolean guards the listener, costing zero
additional state renders and requiring no changes outside `sync-context.tsx`.

## Goals / Non-Goals

**Goals:**

- Prevent the change listener from scheduling a new sync while one is already
  running.
- Keep the implementation entirely inside `SyncProvider`; no API or data-model
  changes.
- Maintain all existing triggers: on-login, online event, manual `trigger()`.

**Non-Goals:**

- Queueing or rate-limiting sync calls beyond what the debounce already provides.
- Handling concurrent syncs from multiple tabs (a separate concern).
- Changing the sync algorithm or server-side route.

## Decisions

### D1 — `useRef` over `useState` for the guard flag

**Decision**: Use `const syncInProgressRef = useRef(false)` rather than
`useState`.

**Rationale**: The flag is read synchronously inside the change-listener
callback. A `useState` setter is asynchronous and the stale-closure problem
would mean a newly scheduled timeout might still read `false` from a captured
snapshot. A `ref` is mutated in place and always reads the current value with no
re-render overhead.

**Alternative considered**: Lifting the guard into `runSync` itself via a module-
level variable. Rejected because it would prevent multiple `SyncProvider`
instances (e.g., in tests) from having independent state.

### D2 — Guard only the debounce path, not `trigger()` itself

**Decision**: Set `syncInProgressRef.current = true` at the start of the
`runSync` call inside `trigger`, reset on completion/error. Only suppress the
debounce-timer scheduling in the changes callback, not the `trigger` function
itself.

**Rationale**: The on-login and online-event triggers call `trigger()` directly
and should always fire. Only the automatic debounce path is the echo source.

## Risks / Trade-offs

- **Edge case — very long sync**: If a sync takes longer than
  `AUTO_SYNC_DEBOUNCE_MS` (2 s) a real local write during that window will be
  suppressed. It will be caught by the next sync triggered after the current one
  completes (since `trigger` is called on login/online and can also be called
  manually). Acceptable trade-off.
- **Test coverage**: `SyncProvider` is a React component; the node test
  environment doesn't support rendering. The guard logic should be extracted into
  a pure helper so it can be unit-tested, or tested via an integration test if
  the environment is upgraded. Document this limitation in the task.
