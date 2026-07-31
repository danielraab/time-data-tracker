## ADDED Requirements

### Requirement: Quick-add buttons on series detail view

The series detail view SHALL display quick-add buttons for "Point" and "Start Duration" in the entries section header, positioned to the left of the "Add entry" button. Tapping either button SHALL immediately create the corresponding entry for the current series without opening the "Add entry" dialog.

#### Scenario: Tapping Point creates a point entry immediately

- **WHEN** the user taps the "Point" quick-add button on the series detail view
- **THEN** a point entry is created for the current series with the current timestamp and no label
- **THEN** the "Add entry" dialog does NOT open

#### Scenario: Tapping Start Duration creates a duration-start entry immediately

- **WHEN** the user taps the "Start Duration" quick-add button on the series detail view
- **THEN** a duration-start entry is created for the current series with the current timestamp and no label
- **THEN** the "Add entry" dialog does NOT open

#### Scenario: Quick-add buttons are positioned left of Add entry

- **WHEN** the series detail view renders its entries section header for a non-archived series
- **THEN** the "Point" and "Start Duration" buttons appear to the left of the "Add entry" button within the same right-aligned button group
- **THEN** the "Add entry" button remains the rightmost button in that group

### Requirement: Quick-add End Duration button reflects open duration state

The series detail view SHALL show an "End Duration" quick-add button only when the current series has an open (unclosed) duration. Tapping it SHALL immediately create a duration-end entry linked to that open duration.

#### Scenario: End Duration hidden when no open duration exists

- **WHEN** the series detail view renders for a series with no open duration
- **THEN** the "End Duration" quick-add button is not rendered

#### Scenario: End Duration visible when an open duration exists

- **WHEN** the series detail view renders for a series that has an open (unclosed) duration
- **THEN** the "End Duration" quick-add button is rendered, positioned left of "Add entry"

#### Scenario: Tapping End Duration closes the open duration

- **WHEN** the user taps the "End Duration" quick-add button
- **THEN** a duration-end entry is created for the current series with the current timestamp, linked to the open duration's start entry
- **THEN** the "End Duration" button no longer renders once the series has no other open duration

### Requirement: Quick-add buttons respect archived series read-only state

The series detail view SHALL hide all quick-add buttons (Point, Start Duration, End Duration) when the series is archived, consistent with the existing "Add entry" button's visibility rule.

#### Scenario: Quick-add buttons hidden for archived series

- **WHEN** the series detail view renders for an archived series
- **THEN** none of the Point, Start Duration, or End Duration quick-add buttons are rendered

### Requirement: Quick-add actions sync and confirm

Each successful quick-add action on the series detail view SHALL trigger a data sync and show a success toast, consistent with the dashboard's quick-add buttons.

#### Scenario: Successful quick-add triggers sync and toast

- **WHEN** a quick-add button on the series detail view successfully creates an entry
- **THEN** a sync is triggered
- **THEN** a success toast is shown
