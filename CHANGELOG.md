# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-25

### Added

- **Backend-mediated CouchDB sync (Phase 3)**: data syncs bidirectionally between
  the local PouchDB store and a per-user CouchDB database on the server whenever
  the user is signed in and online.
  - `GET /api/sync?since=<seq>` — incremental pull via the CouchDB `_changes` feed;
    returns only live `series` and `entry` docs with the CouchDB revision stripped.
  - `POST /api/sync` — push with last-write-wins on `updatedAt`; the server fetches
    existing revisions and skips docs the server already has at the same or newer
    version.
  - Per-user database isolation: each account gets its own CouchDB database
    (`tidatra_<userId>`), created automatically on first sync.
  - Sequence-based checkpoint persisted in local PouchDB (`sync:checkpoint`) so
    subsequent syncs transfer only the delta.
  - **Guest → account migration**: on first login, all local series that still have
    `ownerId: null` are claimed for the signed-in user before the first push.
- **Automatic sync on data changes**: a `SyncProvider` in the app layout subscribes
  to the PouchDB `changes` feed; any local write (series or entry create / edit /
  delete) triggers a sync automatically after a 2-second debounce — no need to touch
  individual mutation components.
- **Sync button in header**: always-visible sync button in the app header.
  - Idle: `RefreshCw` icon, clickable to trigger a manual sync.
  - Syncing: animated spinner.
  - Synced: green check mark, fades back to idle after 3 s.
  - Error: red Wi-Fi-off icon, clickable to retry.
  - Not signed in: button rendered but disabled with a "Sign in to sync" tooltip.
- Sync also fires automatically on login and whenever the browser regains network
  connectivity (`window.online` event).
- **Authentication (Phase 2)**: sign-in via magic link (email) or OAuth — Google,
  GitHub, and Authentik OIDC. Powered by `better-auth` with a local SQLite store.
- **Magic-link email via SMTP**: any SMTP server; in development the link is printed
  to the server console when no SMTP host is configured.
- **Login page** (`/login`) and account menu in the header (name, sign-out).
- **Mailpit dev service**: catches outgoing emails locally; port 8025 forwarded to host.

### Changed

- `COUCHDB_URL` env var now holds the **base URL** of the CouchDB server (no database
  path). Two new companion vars `COUCHDB_USER` and `COUCHDB_PASSWORD` carry the admin
  credentials. The dev container defaults (`admin` / `password`) are pre-filled in
  `.env.example`.
- Removed the unused `GET /api/config` route and `lib/config.ts` module — the client
  no longer needs the CouchDB URL because all sync is server-mediated.
- Sync state management moved from `AppHeader` into a new `SyncProvider` /
  `useSyncContext` React context so any component in the tree can read or trigger sync.
- `AppHeader` converted to a client component to display live session state via
  `useSession()`.

### Fixed

- `server-only` package now aliased to a no-op stub in `vitest.config.ts` so
  server-side modules (e.g. `lib/couch.ts`) can be imported in the Vitest test
  environment without throwing.

## [0.3.0] - 2026-05-24

### Added

- **Quick-add entry from dashboard**: an "Add entry" button in the dashboard header opens
  a modal where the target series is selected via a dropdown, then the full entry form is
  presented inline — no need to navigate into a series first.
- **Reversed-duration warning**: paired duration entries whose end timestamp is earlier
  than the start timestamp are highlighted with a red border and a ⚠ "End is before start"
  label so data errors are immediately visible in the entry list.

### Changed

- **Entry type selector redesigned**: the type `<Select>` dropdown is replaced by two
  segmented toggle buttons. The top toggle switches between **Point** (● icon) and
  **Duration** (⏱ icon). A second, smaller sub-toggle appears left of the input field:
  **Text | Number** for point entries and **Start | End** for duration entries. Field labels
  are aligned to the input field only, not the toggle buttons.

## [0.2.0] - 2026-05-24

### Added

- **GPS location map**: entries that have a recorded GPS location now show a clickable
  pin badge. Clicking it opens a modal with an embedded OpenStreetMap view centred on
  the coordinates, an accuracy indicator, and an "Open in OpenStreetMap" link. Applies
  to all entry types (point, paired span, open start, orphan end).
- **Series locations map**: when at least one entry in a series has a GPS location, a
  "Show on map" button appears in the entries section header. Clicking it opens a modal
  with a Leaflet map showing all located entries as markers; each marker popup shows the
  entry's timestamp and label. The map auto-fits its bounds to include all markers.

## [0.1.1] - 2026-05-24

### Fixed

- **PWA offline navigation**: series detail pages that were prefetched by Next.js while online
  (via `<Link>` viewport prefetching) are now correctly served from the service worker cache
  when offline. Previously the `Vary: Next-Router-Prefetch` response header caused cache
  lookups to miss the stored prefetch response, falling back to a network request that failed.
  Fixed by using `{ ignoreVary: true }` in all `caches.match()` calls.
- **Service worker unhandled rejection**: cache-first fetch handler no longer throws an
  unhandled `TypeError` when a resource is not in cache and the network is unavailable.
  Offline misses now return a `503` response instead of a broken promise.

## [0.1.0] - 2026-05-23

### Added

- **Series management**: create, edit, and delete time series with title, description, and
  free-form tags.
- **Entry types**: record point-in-time entries (numeric value or text label) and duration
  spans (start/end pairs).
- **Span linking**: link an orphan duration-end to an open duration-start and vice versa;
  unlink paired spans back to individual entries.
- **Open-span detection**: open duration starts and orphan ends are visually flagged in the
  entry list and surfaced on the dashboard.
- **Timeline**: per-series day-by-day timeline view with forward/back navigation and
  click-to-add-entry support.
- **Offline-first PWA**: all data is stored in a local PouchDB database; a service worker
  caches the app shell and visited pages so the app works without a network connection.
- **Docker support**: `Dockerfile` and `docker-compose.yml` for self-hosted production
  deployments.
- **CI/CD**: GitHub Actions workflow that builds and publishes a Docker image on every push
  to `master`.
- **App footer**: displays the current app version and a link to the GitHub repository.

[Unreleased]: https://github.com/draab/time-data-tracker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/draab/time-data-tracker/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/draab/time-data-tracker/compare/v0.2.0...v0.3.0
[0.1.1]: https://github.com/draab/time-data-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/draab/time-data-tracker/releases/tag/v0.1.0
