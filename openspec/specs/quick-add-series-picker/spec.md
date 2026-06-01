### Requirement: Series picker visible on Quick Add card

The Quick Add card SHALL display the current default series title as a clickable
dropdown trigger (replacing the plain navigation link).

#### Scenario: Trigger renders with current default series

- **WHEN** the dashboard loads and a default series exists
- **THEN** the Quick Add card SHALL show the default series title as a button-like element with a visual affordance (e.g., chevron icon) indicating it is interactive

#### Scenario: No series available

- **WHEN** no series exist
- **THEN** the Quick Add card SHALL show the existing "no default series" message and no picker trigger

---

### Requirement: Dropdown lists all non-archived series

Opening the series picker trigger SHALL display a dropdown menu listing every non-archived series.

#### Scenario: All series appear in the list

- **WHEN** the user clicks the series picker trigger
- **THEN** a dropdown SHALL open listing all non-archived series by title, with the current default series visually distinguished (e.g., a checkmark)

#### Scenario: Currently-default series is marked

- **WHEN** the dropdown is open
- **THEN** the series currently set as default SHALL be visually marked to indicate it is the active selection

---

### Requirement: Selecting a series updates the Quick Add target

Choosing a series from the picker SHALL immediately update the default series and close the dropdown.

#### Scenario: User picks a different series

- **WHEN** the user selects a series that is not currently the default
- **THEN** the system SHALL call `setDefaultSeries` with the selected series id, the dropdown SHALL close, and the Quick Add card title SHALL update to the newly selected series

#### Scenario: User picks the already-default series

- **WHEN** the user selects the series that is already the default
- **THEN** the system SHALL close the dropdown without making a database write

#### Scenario: Picker is disabled during in-flight switch

- **WHEN** a `setDefaultSeries` call is in progress
- **THEN** the dropdown items SHALL be non-interactive until the call resolves

---

### Requirement: Navigation to series detail is preserved

Each series entry in the dropdown SHALL include a link to the series detail page.

#### Scenario: Navigate to series from picker

- **WHEN** the user activates the navigation affordance for a series within the picker
- **THEN** the browser SHALL navigate to the series detail page for that series
