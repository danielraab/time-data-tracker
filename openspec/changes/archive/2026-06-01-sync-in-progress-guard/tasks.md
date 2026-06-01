## 1. Guard Implementation

- [x] 1.1 Add `const syncInProgressRef = useRef(false)` inside `SyncProvider` in `lib/db/sync-context.tsx`
- [x] 1.2 Set `syncInProgressRef.current = true` at the start of the async block inside `trigger`, before calling `runSync`
- [x] 1.3 Reset `syncInProgressRef.current = false` in the `.then()` handler (before `setState("synced")`)
- [x] 1.4 Reset `syncInProgressRef.current = false` in the `.catch()` handler (before `setState("error")`)

## 2. Change Listener Guard

- [x] 2.1 In the PouchDB `changes` listener callback in `sync-context.tsx`, add an early-return guard: `if (syncInProgressRef.current) return;` after the `sync:checkpoint` filter
- [x] 2.2 Verify the guard ref is captured correctly in the closure (no stale-ref risk with `useRef`)

## 3. Verification

- [x] 3.1 Run `pnpm lint` and confirm no new lint errors in `sync-context.tsx`
- [ ] 3.2 Manual smoke test: log in with data present, confirm only one sync round-trip fires (check network tab — no second `GET /api/sync` after the first completes)
- [x] 3.3 Note in a code comment that `SyncProvider` guard logic is not unit-tested due to the `node` test environment not supporting React rendering; link to the spec
