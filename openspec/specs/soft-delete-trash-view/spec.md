## ADDED Requirements

### Requirement: Trash view for soft-deleted content

The system SHALL provide a dedicated trash view that lists soft-deleted series and entries separately from the active dashboard and active series views.

#### Scenario: Soft-deleted series appear in trash

- **WHEN** a series has `deletedAt` set
- **THEN** the series appears in the trash view
- **AND** it does not appear in the active series overview

#### Scenario: Soft-deleted entries appear in trash

- **WHEN** an entry has `deletedAt` set
- **THEN** the entry appears in the trash view
- **AND** it does not appear in the active entry lists

#### Scenario: Trash view excludes active content

- **WHEN** a series or entry does not have `deletedAt` set
- **THEN** it does not appear in the trash view

### Requirement: Trash view shows deletion metadata

The trash view SHALL show deletion metadata for each soft-deleted item, including when the item was deleted and whether it is eligible for automatic purge.

#### Scenario: Deletion age is visible

- **WHEN** a soft-deleted item is rendered in the trash view
- **THEN** the view shows the `deletedAt` timestamp or a human-readable age derived from it

#### Scenario: Purge eligibility is visible

- **WHEN** a soft-deleted item has been deleted for less than 30 days
- **THEN** the trash view shows that the item is not yet purge eligible

#### Scenario: Eligible items are marked

- **WHEN** a soft-deleted item has been deleted for at least 30 days
- **THEN** the trash view shows that the item is eligible for purge

### Requirement: Trash view supports edit and restore actions

The trash view SHALL allow a soft-deleted series or entry to be edited while remaining deleted and SHALL provide an explicit restore action that clears `deletedAt`.

#### Scenario: Editing does not restore the item

- **WHEN** a user edits a soft-deleted series or entry and saves the changes
- **THEN** the item remains soft-deleted
- **AND** `deletedAt` remains set

#### Scenario: Restore makes the item active again

- **WHEN** a user restores a soft-deleted series or entry
- **THEN** `deletedAt` is cleared
- **AND** the item appears in the active views again

#### Scenario: Deleted series still show child entry context

- **WHEN** a soft-deleted series is shown in the trash view
- **THEN** the view shows the number of entries associated with that series
- **AND** the child entries are represented as soft-deleted content as well

#### Scenario: Deleted entry shows its parent series

- **WHEN** a soft-deleted entry is shown in the trash view
- **THEN** the view shows the entry's parent series identity
