## ADDED Requirements

### Requirement: Sync re-entrancy guard

The `SyncProvider` SHALL maintain a boolean guard that is `true` for the entire
duration of any active `runSync` call and `false` otherwise.

#### Scenario: Guard is set before sync starts

- **WHEN** `trigger()` is called and no sync is currently running
- **THEN** the guard is set to `true` before `runSync` is awaited

#### Scenario: Guard is cleared on success

- **WHEN** `runSync` resolves successfully
- **THEN** the guard is reset to `false`

#### Scenario: Guard is cleared on error

- **WHEN** `runSync` rejects with an error
- **THEN** the guard is reset to `false` before the error state is applied

### Requirement: Change listener respects the guard

The PouchDB changes listener SHALL NOT schedule a debounced sync trigger while
the re-entrancy guard is `true`.

#### Scenario: Change event during active sync is suppressed

- **WHEN** a PouchDB change event fires while `syncInProgressRef.current` is `true`
- **THEN** no new debounce timer is scheduled

#### Scenario: Change event after sync completes is handled normally

- **WHEN** a PouchDB change event fires while `syncInProgressRef.current` is `false`
- **AND** the user is logged in
- **THEN** the debounce timer is scheduled as before
