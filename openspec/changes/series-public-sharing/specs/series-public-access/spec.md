## ADDED Requirements

### Requirement: Series can be marked public by its owner
A series owner SHALL be able to toggle a series between private (default) and public. The `isPublic` flag is stored on the Series document and syncs with the server via the normal PouchDB ↔ CouchDB sync path. The toggle SHALL be disabled and accompanied by explanatory text when the series has not yet been synced to the server (`ownerId === null`).

#### Scenario: Owner enables public sharing
- **WHEN** an authenticated owner toggles "Make public" on a synced series
- **THEN** the series document is updated with `isPublic: true` in PouchDB and eventually syncs to CouchDB

#### Scenario: Owner disables public sharing
- **WHEN** an authenticated owner toggles public sharing off
- **THEN** the series document is updated with `isPublic: false`; subsequent requests to the public URL SHALL return 404

#### Scenario: Toggle unavailable for unsynced series
- **WHEN** the series has `ownerId === null` (local-only, never synced)
- **THEN** the public toggle SHALL be rendered disabled with a message explaining that the series must be synced to an account before it can be published

### Requirement: A public series is accessible via a shareable URL
A public series SHALL be accessible at `/public/[ownerId]/[seriesId]` without authentication. The page SHALL render the series title, description, tags, and all entries in read-only form.

#### Scenario: Visitor opens a valid public URL
- **WHEN** any user (authenticated or not) navigates to `/public/[ownerId]/[seriesId]` and the series exists with `isPublic: true`
- **THEN** the server SHALL return a rendered read-only page showing the series metadata and all its entries

#### Scenario: Visitor opens a URL for a private series
- **WHEN** any user navigates to `/public/[ownerId]/[seriesId]` and `isPublic` is `false` or absent
- **THEN** the server SHALL return a 404 response (no distinction between "not found" and "private")

#### Scenario: Visitor opens a URL for a deleted series
- **WHEN** a series has `deletedAt` set and `isPublic: true`
- **THEN** the server SHALL return 404

#### Scenario: Visitor opens a URL with an unknown ownerId or seriesId
- **WHEN** the requested ownerId or seriesId does not exist in CouchDB
- **THEN** the server SHALL return 404

### Requirement: Public view is entirely read-only
The public view SHALL contain no interactive controls that modify data. No add-entry, edit, delete, or archive actions SHALL appear. Authentication is not prompted.

#### Scenario: Read-only UI on public page
- **WHEN** a public page is rendered for any visitor
- **THEN** no edit, delete, add-entry, or settings controls SHALL be visible or accessible
- **THEN** no authentication prompt or sign-in link SHALL be required to view the page

### Requirement: Public series data is not written to a visitor's local PouchDB
The public page SHALL fetch series data exclusively from the server API. The data SHALL NOT be written into the visitor's browser PouchDB instance.

#### Scenario: Server-only data fetch
- **WHEN** a visitor loads a public series page
- **THEN** data is retrieved via the Next.js Server Component from `GET /api/public/[ownerId]/[seriesId]` (server-side)
- **THEN** no PouchDB write operations are performed in the visitor's browser

### Requirement: Server API enforces public check before returning data
The `GET /api/public/[ownerId]/[seriesId]` route SHALL verify `isPublic === true` and `!deletedAt` before returning any data. It SHALL NOT require an authenticated session.

#### Scenario: API returns series and entries for public series
- **WHEN** a request is made to `GET /api/public/[ownerId]/[seriesId]` and `isPublic === true`
- **THEN** the API SHALL respond with `{ series: Series, entries: Entry[] }` with HTTP 200

#### Scenario: API returns 404 for non-public or missing series
- **WHEN** a request is made for a series that is not public, is deleted, or does not exist
- **THEN** the API SHALL respond with HTTP 404

### Requirement: Owner can copy the public share link
When a series is public, the series settings UI SHALL display the public URL and provide a one-click copy-to-clipboard action.

#### Scenario: Copy link visible when series is public
- **WHEN** the series has `isPublic: true` and `ownerId !== null`
- **THEN** the settings UI SHALL show the full public URL and a copy button

#### Scenario: Copy link not shown when series is private
- **WHEN** `isPublic` is `false` or absent
- **THEN** no public URL or copy button SHALL be shown
