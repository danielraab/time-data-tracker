# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Authentication (Phase 2)**: sign-in via magic link (email) or OAuth — Google, GitHub,
  and Authentik OIDC. Powered by `better-auth` with a local SQLite store.
- **Magic-link email via SMTP**: any SMTP server can be used (configured through
  `SMTP_HOST/PORT/USER/PASS/FROM` env vars). In development, the link is printed to the
  server console when no SMTP host is set, so no mail server is needed to try the flow.
- **Login page** (`/login`): email form for magic links and buttons for each OAuth
  provider that is enabled through env vars. Providers absent from the environment are
  hidden automatically — no code changes required.
- **Account menu in header**: shows the signed-in user's name and a "Sign out" button
  when authenticated; shows a "Sign in" link otherwise. App is fully usable while
  signed out (local-only mode unchanged).
- **Mailpit dev service**: the dev container now runs
  [Mailpit](https://github.com/axllent/mailpit) on port 1025 (SMTP) / 8025 (web UI)
  to catch outgoing magic-link emails locally. Port 8025 is forwarded to the host.
- **`.env.example`** updated with all auth, SMTP, and OAuth variables; SMTP defaults
  point to the Mailpit dev service.

### Changed

- `AppHeader` converted to a client component to display live session state via
  `useSession()`.

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

[Unreleased]: https://github.com/draab/time-data-tracker/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/draab/time-data-tracker/compare/v0.2.0...v0.3.0
[0.1.1]: https://github.com/draab/time-data-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/draab/time-data-tracker/releases/tag/v0.1.0
