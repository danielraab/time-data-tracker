## ADDED Requirements

### Requirement: Foreground periodic sync timer

`SyncProvider` SHALL start a repeating timer that calls `trigger()` every
`FOREGROUND_SYNC_INTERVAL_MS` (60 000 ms / 1 minute) whenever the user is authenticated.
The timer MUST be cleared when the user signs out or `SyncProvider` unmounts.
This interval is independent of the Periodic Background Sync interval.

#### Scenario: Timer fires while authenticated

- **WHEN** the user is signed in and 1 minute elapses since the last timer tick
- **THEN** `trigger()` is called, initiating a sync cycle

#### Scenario: Timer is inactive when unauthenticated

- **WHEN** the user is not signed in
- **THEN** no periodic timer is active and no automatic sync is scheduled

#### Scenario: Timer is cleared on logout

- **WHEN** the user signs out (userId transitions to null)
- **THEN** the interval is cleared and no further ticks fire

#### Scenario: Timer respects in-progress guard

- **WHEN** the timer fires while a sync is already running
- **THEN** `trigger()` returns immediately (no-op) and no second sync is started

### Requirement: Exported PBS interval constant

The value `SYNC_INTERVAL_MS = 300_000` SHALL be exported from
`lib/db/sync-context.tsx` so the Periodic Background Sync registration can
import and reuse it without hardcoding. This constant is independent of
`FOREGROUND_SYNC_INTERVAL_MS` and governs only the background sync cadence.

#### Scenario: Constant is importable

- **WHEN** `pwa/service-worker-register.tsx` imports `SYNC_INTERVAL_MS`
- **THEN** it receives the number `300000`
