## ADDED Requirements

### Requirement: Owner-only destructive actions

The system SHALL allow only the owner of a series or entry to permanently delete or purge that record.

#### Scenario: Owner can purge own content

- **WHEN** the authenticated user owns a soft-deleted series or entry
- **THEN** the user can permanently delete it

#### Scenario: Non-owner cannot purge shared content

- **WHEN** the authenticated user does not own a series or entry
- **THEN** the user cannot permanently delete or purge that record

#### Scenario: Ownership guard applies to future shared data

- **WHEN** a series or entry is shared with another user in the future
- **THEN** the non-owner user can still view the shared record if allowed
- **AND** the non-owner user cannot purge or permanently delete it

### Requirement: Restore and edit are not destructive actions

The system SHALL allow restore and edit actions on soft-deleted content independently of the owner-only purge guard.

#### Scenario: Non-owner edit is allowed when sharing permits it

- **WHEN** a shared record is editable by the current user
- **THEN** the user can edit the soft-deleted record without permanently deleting it

#### Scenario: Restore does not require purge privilege

- **WHEN** a soft-deleted record is restored
- **THEN** the action clears `deletedAt`
- **AND** the action does not require permanent-delete privileges
