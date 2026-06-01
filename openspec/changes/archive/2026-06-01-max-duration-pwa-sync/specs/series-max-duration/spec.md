## ADDED Requirements

### Requirement: Max duration field on series
A series SHALL support an optional `maxDurationMinutes` positive integer field. When absent or null the feature is disabled for that series.

#### Scenario: Field is optional on create
- **WHEN** a user creates a series without setting max duration
- **THEN** the series is saved without `maxDurationMinutes` and all duration behavior is unchanged

#### Scenario: Field is persisted on create
- **WHEN** a user creates a series and sets max duration to a positive integer
- **THEN** the series is saved with `maxDurationMinutes` equal to the provided value

#### Scenario: Field is editable
- **WHEN** a user edits a series and changes the max duration value
- **THEN** the series is updated with the new `maxDurationMinutes` value

#### Scenario: Field can be cleared
- **WHEN** a user edits a series and removes the max duration value
- **THEN** `maxDurationMinutes` is removed or set to null and the feature is disabled for that series

### Requirement: Max duration form input
The series create and edit form SHALL include an optional numeric input labeled "Max duration (min)" for `maxDurationMinutes`. The input SHALL accept only positive integers and SHALL be optional.

#### Scenario: Input accepts positive integer
- **WHEN** the user enters a positive integer in the max duration field
- **THEN** the value is stored as a number and saved with the series

#### Scenario: Input rejects zero or negative values
- **WHEN** the user enters 0 or a negative number
- **THEN** the form considers the field invalid and prevents submission

#### Scenario: Input can be left blank
- **WHEN** the user leaves the max duration field blank
- **THEN** the series is saved without a max duration constraint

### Requirement: Closed overrun duration styling
A closed duration (paired span_start + span_end) whose elapsed time exceeds the series `maxDurationMinutes` SHALL be rendered with red text color to visually distinguish it from within-limit durations.

#### Scenario: Closed overrun duration is red
- **WHEN** a closed duration's elapsed minutes exceed the series `maxDurationMinutes`
- **THEN** the duration display element is styled with red text

#### Scenario: Closed within-limit duration is unstyled
- **WHEN** a closed duration's elapsed minutes are at or below `maxDurationMinutes`
- **THEN** the duration display element has no overrun styling

#### Scenario: No max duration set
- **WHEN** the series has no `maxDurationMinutes`
- **THEN** no overrun styling is applied to any closed duration

### Requirement: Open overrun duration indicator
An open duration (span_start with no matching span_end) whose age in minutes exceeds the series `maxDurationMinutes` SHALL display a discrete red pulsing indicator to draw attention without being distracting.

#### Scenario: Open overrun shows pulse indicator
- **WHEN** an open duration's age in minutes exceeds the series `maxDurationMinutes`
- **THEN** a small red pulsing dot indicator is shown alongside the open duration entry

#### Scenario: Open within-limit shows no indicator
- **WHEN** an open duration's age in minutes is at or below `maxDurationMinutes`
- **THEN** no pulse indicator is shown

#### Scenario: No max duration set
- **WHEN** the series has no `maxDurationMinutes`
- **THEN** no pulse indicator is shown for any open duration

### Requirement: Overrun notification
When the app is in the foreground, the system SHALL send a browser notification once per open duration when that duration's age first exceeds the series `maxDurationMinutes`. When the app is in the background, the service worker SHALL trigger the same notification via the background sync endpoint.

#### Scenario: Foreground notification fires once per overrun
- **WHEN** an open duration's age crosses `maxDurationMinutes` while the app is open
- **THEN** a browser notification is sent with the series title and the elapsed duration
- **AND** no further notification is sent for that same open duration until it is closed

#### Scenario: Notification requires permission
- **WHEN** `Notification.permission` is not `"granted"`
- **THEN** no notification is sent and no error is thrown

#### Scenario: Notification deduplication
- **WHEN** a notification has already been sent for a given open duration
- **THEN** subsequent interval ticks do not send another notification for that duration

#### Scenario: Deduplication clears on close
- **WHEN** an open duration is closed
- **THEN** the deduplication record for that duration is cleared so a future re-open of the same series can trigger a new notification

#### Scenario: Background notification via API
- **WHEN** a `periodicsync` event fires and the `/api/notify-overrun` endpoint returns overrun open durations
- **THEN** the service worker shows a notification for each overrun duration not already notified
