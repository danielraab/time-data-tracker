## ADDED Requirements

### Requirement: Thirty-day purge policy

The system SHALL permanently delete any soft-deleted series or entry once it has been soft-deleted for more than 30 days.

#### Scenario: Newly deleted items are retained

- **WHEN** a series or entry has been soft-deleted for fewer than 30 days
- **THEN** the system retains the item in soft-deleted form
- **AND** does not hard-delete it

#### Scenario: Old deleted items are purged

- **WHEN** a series or entry has been soft-deleted for more than 30 days
- **THEN** the system permanently deletes the item
- **AND** the item no longer appears in the local database or the synced CouchDB database

#### Scenario: Purge timing is based on deletedAt

- **WHEN** the system determines purge eligibility
- **THEN** it uses `deletedAt` as the source of truth for the retention clock

### Requirement: Series purge cascades to entries

When a soft-deleted series is permanently deleted, the system SHALL also permanently delete every entry that belongs to that series.

#### Scenario: Purging a series removes child entries

- **WHEN** a soft-deleted series becomes purge eligible
- **THEN** the series is hard-deleted
- **AND** all entries with that series as `seriesId` are hard-deleted in the same purge pass

#### Scenario: No orphaned deleted entries remain after purge

- **WHEN** a soft-deleted series is purged
- **THEN** no entry belonging to that series remains in the trash view or in storage

### Requirement: Purge uses normal hard delete paths

The system SHALL perform permanent deletion by issuing normal hard-delete operations against the local database and the synced CouchDB database.

#### Scenario: Local purge removes the doc

- **WHEN** a soft-deleted item is purged locally
- **THEN** the local database removes the document rather than clearing `deletedAt`

#### Scenario: Server purge removes the doc

- **WHEN** a soft-deleted item is purged on the server
- **THEN** the per-user CouchDB database removes the document rather than preserving it as an active record

#### Scenario: Hard-delete tombstones do not reappear as soft deletes

- **WHEN** the system later syncs after a hard delete
- **THEN** the hard-deleted tombstone is not treated as an active soft-deleted item
