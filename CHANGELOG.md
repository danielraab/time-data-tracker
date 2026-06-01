# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Deleted entries and series now sync correctly across devices**: deletions were
  previously invisible to the sync pipeline because PouchDB tombstones (`_deleted: true`)
  are excluded from `db.find()` queries (used to gather docs to push) and were also
  filtered out on the server side in `getChangesSince`. Switched to **soft delete**: a
  `deletedAt` timestamp is written to the doc alongside an updated `updatedAt`, so deleted
  docs flow through the normal last-write-wins push/pull cycle and are applied on all other
  devices on the next sync. UI queries (`listEntries`, `listSeries`, `getSeries`, etc.)
  filter out soft-deleted docs; `listAllEntries` / `listAllSeries` (sync-only) return the
  full set.

### Changed

- **Immediate sync on every local write**: creating, editing, or deleting an entry or
  series now triggers a sync immediately (rather than waiting for the 2-second debounce)
  when the user is signed in. Affected components: `AddEntryDialog`, `QuickAdd`,
  `SeriesCard`, `SeriesForm`, `SeriesHeader`, `OpenStartItem`, `PointItem`,
  `PairedSpanItem`, `OrphanEndItem`. The existing debounce remains as a fallback for any
  other writes. No-op when the user is not signed in.

## [1.4.0] - 2026-05-29

### Added

- **Long-press on quick-add buttons to enter a label**: pressing and holding any quick-add
  button (_Add point_, _Start duration_, _End duration_) for 500 ms opens a **Quick Label**
  modal instead of immediately saving. The modal shows a text input pre-populated with the
  most recently used label for that series, lists the five most recent labels as one-click
  chips, and confirms with Enter or the _Add_ button. A short press still saves immediately
  with no label. Implemented via a new `useLongPress` hook (`lib/use-long-press.ts`) and a
  new `QuickLabelModal` component (`components/entries/quick-label-modal.tsx`).

### Removed

- Unused default Next.js SVG icon files (`public/file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg`, `app/favicon.ico`) removed from the repository.

## [1.3.0] - 2026-05-27

### Added

- **Daily duration total on the series detail view**: below the timeline, the sum of all
  duration spans that overlap the currently displayed day is shown as "Total duration: Xh
  YYm". Open spans (no end entry) whose start is before the current time contribute their
  elapsed time up to now. The total updates automatically as time passes (via `useNow`)
  and disappears when the day has no duration data. Implemented via a new pure helper
  `sumDurationsForDay` in `lib/spans.ts` and an `onDayChange` callback prop added to
  `Timeline`.

### Changed

- **Duration display no longer shows seconds**: `formatDurationDetailed` now formats
  durations as `"Xh YYm"`, `"Xm"`, or `"< 1m"` — seconds are omitted everywhere
  (paired span items, open-start items, and the daily total).

- **Quick-add buttons on every series card**: each active series card on the home page
  now shows icon-only action buttons (_Add point_ `CircleDot`, _Start duration_ `Play`)
  at the bottom-right of the card. When an open duration exists for that series a _End
  duration_ `Square` button also appears. Buttons use `e.stopPropagation()` so clicking
  them does not navigate to the series detail page. Archived series cards show no
  quick-add buttons.
- **Toast feedback on quick-add actions**: a `sonner` success toast appears at the top
  center after every quick-add button press ("Point added", "Duration started", "Duration
  ended") — both from the default-series quick-add bar and from the per-card buttons.

- **Drag-to-create duration on the timeline**: dragging (mouse/pen) along the timeline
  lane creates a new duration entry. A dashed preview rectangle shows the time range
  while dragging; releasing fires `onCreateDuration(startIso, endIso)`. Touch input
  intentionally falls back to tap-to-add to avoid conflicting with scroll. A hint text
  is shown at the bottom of the timeline when the callback is wired up.
- **Full-duration mode in the Add Entry dialog**: when the dialog is opened via
  drag-to-create, it pre-fills both start and end timestamps and saves a linked
  `span_start` + `span_end` pair atomically on submit. The Point/Duration type toggle is
  hidden in this mode; only the duration and GPS parts are shown.
- **Add Entry sub-components extracted to own files** (`components/entries/add-entry-form/`):
  `TypeSwitch`, `PointPart`, `DurationSinglePart` (single span_start or span_end),
  `DurationFullPart` (linked start+end pair), and `GpsPart`. `AddEntryForm` in
  `add-entry-dialog.tsx` is now a lean orchestrator that delegates rendering to these
  focused components.

## [1.2.0] - 2026-05-26

### Added

- **"Sign out and clear local data" action**: a second logout button in the account
  dropdown clears the local PouchDB database (`destroyDb`) before signing out, allowing
  users to wipe all locally cached data from the device in one step.
- **Default series**: exactly one series is flagged as the default at all times. The
  first series created is auto-promoted; `setDefaultSeries` moves the flag and clears it
  from all others; deleting the default series promotes the next-newest remaining one.
  The default is indicated by a ★ icon on the series card and the series detail header;
  a ☆ button in the detail header lets users reassign the default.
- **Quick-add bar on the home page**: three one-tap buttons above the series list add an
  entry directly to the default series without opening a dialog — _Add point_ (blank
  `point_label`), _Start duration_ (blank `span_start`), and _End duration_ (blank
  `span_end` linked to the most recent open start). The _End duration_ button is only
  shown when an open duration exists in the default series.
- **Archive flag for series**: a series can be archived via the series detail header.
  Archived series are hidden from the overview list and are fully read-only (no new
  entries, no editing of existing entries, no renaming). Archiving the default series
  auto-promotes the next active series as the new default. A "Show archived" toggle on
  the home page reveals archived series in a separate section; archived series can be
  unarchived or permanently deleted from their detail page.

### Changed

- **"New time series" opens in a modal**: clicking _New time series_ on the home page
  now opens a dialog instead of navigating to a separate `/series/new` page. After
  successful creation the dialog closes and the app navigates to the new series.
- **Responsive header buttons on the home page**: the "Add entry" and "New series"
  buttons collapse to icon-only on small screens to avoid overflow on mobile. Labels
  reappear on `sm` (≥ 640 px) and wider viewports.
- **"Show archived" button placement**: moved from the header button group to a
  full-width ghost button below the active series list, preventing the header from
  overflowing on narrow screens.

## [1.1.2] - 2026-05-26

### Fixed

- **Service worker caching auth endpoints**: the PWA service worker now bypasses all
  `/api/*` routes and never serves them from cache. Previously, `GET /api/auth/*`
  responses could be cached and replayed, breaking login on production. Cache version
  bumped to `tidatra-v2` to force eviction of stale cached auth responses on existing clients.
- **Instrumentation test isolation**: mocked `ensureSystemDbs` from `lib/couch` in
  `instrumentation.test.ts` so the test no longer attempts a real CouchDB connection
  on `127.0.0.1:5984` and passes without a running database.

## [1.1.1] - 2026-05-26

### Fixed

- **Production SQLite auth schema migration**: better-auth migrations now run
  unconditionally during server startup instrumentation so production instances
  reliably create the required auth tables.

## [1.1.0] - 2026-05-26

### Added

- **Precise duration display**: entry list now shows an exact duration alongside the
  natural-language badge (e.g. `2h 15m 34s` next to "2 hours") for both completed
  and open spans. A new `formatDurationDetailed` helper in `lib/format.ts` computes
  this from millisecond difference.
- **Live running duration for open spans**: `OpenStartItem` subscribes to a 10-second
  clock tick via `useNow` and shows the elapsed time since the span started —
  `37m 42s until now` — updated in real time without a page refresh.
- **Running duration badge in open-span header**: a natural-language badge
  (e.g. "37 minutes") appears in the metadata row while the span is open, giving
  an at-a-glance overview without reading the content area.

### Changed

- **Entry list visual distinction**: completed spans now use a `Timer` icon and a
  subtle primary-tinted background/border; open (in-progress) spans use an amber
  `Play` icon matching the existing amber card tint. Point entries remain neutral,
  making all three types immediately distinguishable at a glance.
- **Detailed duration placed in content row**: the precise duration string is shown
  inline after the label (or fallback type name) rather than in the crowded metadata
  header row.
- **Timeline: unlabelled spans show time range instead of type name**: when a span
  has no user label the timeline block now renders the time range
  (e.g. `14:30 – 15:45`) directly instead of the generic "Duration start" text.
  Labelled spans still show the label with the time range below (for taller blocks).
- **Mobile-friendly "End duration" button**: the button text is hidden on small screens
  (`hidden sm:inline`) so only the stop icon is visible, preventing the action row from
  overflowing on narrow viewports.

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

[Unreleased]: https://github.com/danielraab/time-data-tracker/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/danielraab/time-data-tracker/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/danielraab/time-data-tracker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/draab/time-data-tracker/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/draab/time-data-tracker/compare/v0.2.0...v0.3.0
[0.1.1]: https://github.com/draab/time-data-tracker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/draab/time-data-tracker/releases/tag/v0.1.0
