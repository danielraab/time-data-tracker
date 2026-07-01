## ADDED Requirements

### Requirement: Timeline briefly highlights the lane element for the clicked entry
When `jumpTo` is called with a `highlightId`, the Timeline SHALL apply a visible highlight to the matching lane element (span, point, or orphan end) and SHALL remove it automatically after approximately 1.5 seconds.

#### Scenario: Span element is highlighted
- **WHEN** a paired span or open-start entry row is clicked
- **THEN** the corresponding span rectangle in the timeline lane shows a stronger border and background for ~1.5 s, then returns to normal

#### Scenario: Point element is highlighted
- **WHEN** a point entry row is clicked
- **THEN** the corresponding point dot in the timeline lane grows slightly and shows a ring for ~1.5 s, then returns to normal

#### Scenario: Orphan end element is highlighted
- **WHEN** an orphan-end entry row is clicked
- **THEN** the corresponding orphan-end dot in the timeline lane grows slightly and shows a ring for ~1.5 s, then returns to normal

#### Scenario: Highlight clears on day navigation
- **WHEN** the user navigates to a different day (prev, next, today, or swipe) while a highlight is active
- **THEN** the highlight is removed immediately

#### Scenario: Rapid clicks reset the timer
- **WHEN** the user clicks a second entry row before the first highlight has faded
- **THEN** the previous highlight is replaced and the 1.5 s timer restarts from the new click
