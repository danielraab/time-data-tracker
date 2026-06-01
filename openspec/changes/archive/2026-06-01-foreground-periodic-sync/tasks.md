## 1. Shared Interval Constant

- [x] 1.1 Add `const FOREGROUND_SYNC_INTERVAL_MS = 60_000;` (1 min, foreground only) and `export const SYNC_INTERVAL_MS = 300_000;` (5 min, PBS export) to `lib/db/sync-context.tsx` as two independent constants

## 2. Foreground Periodic Timer

- [x] 2.1 Add a new `useEffect` in `SyncProvider` that calls `setInterval(trigger, FOREGROUND_SYNC_INTERVAL_MS)` when `userId` is non-null
- [x] 2.2 Return a cleanup function from the effect that calls `clearInterval` on the timer handle
- [x] 2.3 Add `trigger` and `userId` to the effect's dependency array so the interval is reset when the user changes

## 3. Update PBS Registration

- [ ] 3.1 In `components/pwa/service-worker-register.tsx`, import `SYNC_INTERVAL_MS` from `@/lib/db/sync-context`
- [ ] 3.2 Replace the hardcoded `minInterval: 1_800_000` (or whatever value is used) with `minInterval: SYNC_INTERVAL_MS`
<!-- Tasks 3.1–3.2: deferred — service-worker-register.tsx has no PBS code yet;
     the periodicSync.register() call is added by max-duration-pwa-sync.
     Wire up SYNC_INTERVAL_MS there when that change is implemented. -->

## 4. Update `max-duration-pwa-sync` Spec

- [x] 4.1 In `openspec/changes/max-duration-pwa-sync/specs/pwa-background-sync/spec.md`, update the `minInterval` value from `1800000 ms (30 minutes)` to `SYNC_INTERVAL_MS` (300 000 ms / 5 minutes) to stay consistent with this change

## 5. Verification

- [x] 5.1 Run `pnpm lint` — confirm no errors in `sync-context.tsx` or `service-worker-register.tsx`
- [x] 5.2 Run `pnpm test` — confirm existing sync tests still pass
- [ ] 5.3 Manual check: open app in Firefox while signed in; observe network tab shows a `GET /api/sync` approximately every 5 minutes
