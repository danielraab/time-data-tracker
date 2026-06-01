## ADDED Requirements

### Requirement: Long-press on quick-add button opens label modal

When the user holds a quick-add "Point" or "Start Duration" button for at least 500 ms without releasing or moving away, the system SHALL open a lightweight label modal instead of immediately creating an entry. The immediate-create action SHALL NOT fire when a long press is detected.

#### Scenario: Long press on Point button opens modal

- **WHEN** the user presses and holds the "Point" quick-add button for ≥ 500 ms
- **THEN** the label modal opens with the entry type set to "point"
- **THEN** no entry is created immediately

#### Scenario: Long press on Start Duration button opens modal

- **WHEN** the user presses and holds the "Start Duration" quick-add button for ≥ 500 ms
- **THEN** the label modal opens with the entry type set to "span_start"
- **THEN** no entry is created immediately

#### Scenario: Short press still creates entry immediately

- **WHEN** the user clicks (press and release in < 500 ms) a quick-add button
- **THEN** the entry is created immediately with no label
- **THEN** the label modal does NOT open

#### Scenario: Long press cancelled by pointer leave

- **WHEN** the user presses a quick-add button but moves the pointer off the button before 500 ms
- **THEN** no modal opens
- **THEN** no entry is created

### Requirement: Label modal contains only a label field

The label modal SHALL present a single optional text input for the entry label, a submit button, and a cancel/close action. It SHALL NOT include timestamp, GPS, entry type selection, or any other field.

#### Scenario: Modal renders with label input

- **WHEN** the label modal is open
- **THEN** a text input for "Label" is visible and auto-focused
- **THEN** no other entry fields (timestamp, GPS, type) are present

#### Scenario: Submit with label creates labelled entry

- **WHEN** the user types a label and confirms the modal
- **THEN** an entry of the appropriate type is created with the supplied label
- **THEN** the modal closes
- **THEN** a success toast is shown, incorporating the label text when non-empty

#### Scenario: Submit with empty label creates unlabelled entry

- **WHEN** the user confirms the modal without entering a label
- **THEN** an entry of the appropriate type is created with no label
- **THEN** the modal closes

#### Scenario: Cancel modal creates no entry

- **WHEN** the user cancels or dismisses the label modal
- **THEN** no entry is created
- **THEN** the modal closes

### Requirement: Long-press available on both quick-add surfaces

The long-press label behaviour SHALL be available on both the default-series `QuickAdd` dashboard widget and on the per-series `SeriesCard` quick-add buttons.

#### Scenario: Long press works on QuickAdd widget

- **WHEN** the user long-presses Point or Start Duration on the default-series QuickAdd widget
- **THEN** the label modal opens for the default series

#### Scenario: Long press works on SeriesCard buttons

- **WHEN** the user long-presses Point or Start Duration on a SeriesCard
- **THEN** the label modal opens for that specific series
