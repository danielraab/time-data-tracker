## ADDED Requirements

### Requirement: Periodic background sync registration

The PWA SHALL register a Periodic Background Sync task with the tag `tidatra-sync`
and a `minInterval` of `SYNC_INTERVAL_MS` (300 000 ms / 5 minutes, imported from
`lib/db/sync-context.tsx`) when the user is authenticated and the browser supports
the Periodic Background Sync API.

#### Scenario: Registration on authenticated load

- **WHEN** the app loads and the user is signed in
- **THEN** the service worker registration calls `periodicSync.register('tidatra-sync', { minInterval: SYNC_INTERVAL_MS })` if `'periodicSync' in registration`

#### Scenario: No registration when unauthenticated

- **WHEN** the app loads and the user is not signed in
- **THEN** no `periodicsync` registration is attempted

#### Scenario: Unsupported browser

- **WHEN** the browser does not support the Periodic Background Sync API
- **THEN** no error is thrown and the app continues to function normally

### Requirement: Background sync execution

The service worker SHALL call `GET /api/sync` when a `periodicsync` event fires with tag `tidatra-sync`.

#### Scenario: Successful background sync

- **WHEN** a `periodicsync` event fires with tag `tidatra-sync`
- **THEN** the service worker fetches `GET /api/sync` and completes the event without error

#### Scenario: Unauthenticated background sync

- **WHEN** a `periodicsync` event fires and the sync API returns a non-2xx status
- **THEN** the service worker catches the error and does not re-throw it (sync is silently skipped)

#### Scenario: Unknown periodicsync tag

- **WHEN** a `periodicsync` event fires with a tag other than `tidatra-sync`
- **THEN** the service worker ignores the event
