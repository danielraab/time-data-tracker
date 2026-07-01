## ADDED Requirements

### Requirement: Entry row click navigates timeline to entry day
When a user clicks the body of an entry row in the entry list, the Timeline SHALL update its displayed day to the day containing that entry and SHALL scroll its viewport to show the entry's timestamp near the top third of the visible area.

#### Scenario: Click point entry row
- **WHEN** user clicks the body of a point entry row
- **THEN** the Timeline jumps to the day of that entry's timestamp and scrolls to show that time

#### Scenario: Click paired span row
- **WHEN** user clicks the body of a paired span row
- **THEN** the Timeline jumps to the day of the span's start timestamp and scrolls to show the start time

#### Scenario: Click open start row
- **WHEN** user clicks the body of an open start row
- **THEN** the Timeline jumps to the day of the start timestamp and scrolls to show the start time

#### Scenario: Click orphan end row
- **WHEN** user clicks the body of an orphan end row
- **THEN** the Timeline jumps to the day of that entry's timestamp and scrolls to show that time

### Requirement: Action buttons do not trigger timeline navigation
Clicking edit, delete, map, or unlink buttons inside an entry row SHALL NOT trigger timeline navigation.

#### Scenario: Click edit button
- **WHEN** user clicks the edit (pencil) button on an entry row
- **THEN** the edit form opens and the Timeline does NOT change its displayed day or scroll position

#### Scenario: Click delete button
- **WHEN** user clicks the delete (trash) button on an entry row
- **THEN** the delete confirmation appears and the Timeline does NOT change its displayed day or scroll position

#### Scenario: Click map button
- **WHEN** user clicks the map pin button on an entry row
- **THEN** the location map modal opens and the Timeline does NOT change its displayed day or scroll position
