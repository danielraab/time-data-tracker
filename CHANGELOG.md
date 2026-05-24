# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **GPS location map**: entries that have a recorded GPS location now show a clickable
  pin badge. Clicking it opens a modal with an embedded OpenStreetMap view centred on
  the coordinates, an accuracy indicator, and an "Open in OpenStreetMap" link. Applies
  to all entry types (point, paired span, open start, orphan end).

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

[0.1.1]: https://github.com/draab/time-data-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/draab/time-data-tracker/releases/tag/v0.1.0
