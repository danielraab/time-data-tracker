# TiDaTra – Implementation Plan

> Status snapshot as of **2026-05-25**:
>
> - **Phase 1 (local-first MVP): complete** — scaffold, PWA shell, data layer
>   (PouchDB), dashboard, series create/detail, entries, timeline. Lint + build
>   clean.
> - **Bug fix landed**: series detail "could not be found" — caused by colon-
>   bearing `series:<uuid>` IDs round-tripping through URL encode/decode.
>   Replaced by `lib/url.ts` slug helpers so URLs are plain `/series/<uuid>`.
> - **Tests scaffolded**: Vitest + `pouchdb-adapter-memory`. 68 passing tests
>   covering pure helpers (spans, format, url, couch) and data-layer integration
>   (series-repo, entries-repo, sync). Test hook `_setDbForTests` in
>   `lib/db/pouch.ts`; in-memory fixture in `test/db-fixture.ts`. A
>   `test/server-only-stub.ts` stubs the `server-only` package so server modules
>   can be imported in the Vitest (Node) environment.
> - **Phase 2 (auth): complete** — `better-auth` installed; SQLite adapter
>   with auto-migrated schema; magic-link via SMTP (nodemailer — any SMTP
>   server); social providers Google + GitHub; Authentik OIDC via `genericOAuth`
>   plugin. Login page, account menu in header. All providers opt-in via env vars.
>   See `.env.example` for the full variable reference.
> - **Phase 3 (sync): complete** — backend-mediated CouchDB sync. See _Phase 3_
>   below for the full spec.
> - **Up next: Phase 4 (sharing)** — see _Phase 4_ below.

## Context

`time-data-tracker` is currently a bare Next.js 16 / React 19 / Tailwind v4 scaffold
(only `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — all create-next-app
boilerplate). The goal is to build **TiDaTra**, an offline-first PWA for recording
**time series**: named collections of timestamped entries (points in time, numeric
values, and durations), viewable on a dynamic timeline.

Core product constraints (from the spec):

- **Local-first**: fully usable with no account and no network. The browser (PouchDB)
  is the source of truth until the user logs in.
- **Sync on login**: signing in syncs local data to the server and across devices.
- **Server access is mediated**: the browser never talks to CouchDB directly — all
  server writes/reads go through the Next.js backend (confirmed with the user).
- **English UI** for now. UI strings are centralized in `lib/i18n/en.ts` so additional
  locales can be added later without touching components.

### Decisions confirmed with the user

- **Delivery**: phased, **MVP first**. Phase 1 (local offline-only) is built and
  reviewed before auth/sync/sharing.
- **Sign-in methods** (Phase 2): Magic link (email), Authentik OIDC, Google, GitHub.
- **Sync model** (Phase 3): custom backend sync API — PouchDB ⇄ Next.js `/api/sync`
  ⇄ CouchDB; backend enforces auth and per-series sharing permissions.

This plan details **Phase 1** fully and outlines Phases 2–4.

---

## Architecture

```
app/
  layout.tsx               # lang="de", metadata, PWA manifest link, theme
  page.tsx                 # Dashboard
  series/new/page.tsx      # Create time series
  series/[id]/page.tsx     # Series detail (entries + timeline)
  manifest.ts              # PWA manifest (Next metadata route)
components/
  ui/                      # shadcn/ui primitives
  dashboard/               # SeriesList, SeriesCard, TagFilter, SearchBar
  series/                  # SeriesForm, SeriesHeader, TagInput
  entries/                 # EntryList, EntryItem, AddEntryDialog, EntryTypePicker
  timeline/                # Timeline, TimelineEntry, timeline-scale helpers
lib/
  db/
    pouch.ts               # client-only PouchDB instance (+ indexes)
    series-repo.ts         # series CRUD
    entries-repo.ts        # entry CRUD + span helpers
    hooks.ts               # useSeriesList / useSeries / useEntries (live via changes feed)
  types.ts                 # domain types
  i18n/en.ts               # English UI strings (one file per locale; en for now)
  utils.ts                 # cn(), date/format helpers
```

### Data model (PouchDB, single local DB `tidatra`)

`Series` doc — `_id: "series:<uuid>"`

- `type: "series"`, `title`, `description`, `tags: string[]`
- `createdAt`, `updatedAt` (ISO strings)
- `ownerId: string | null` (null while local-only; set on login — Phase 3)
- `shares: Share[]` (Phase 4)

`Entry` doc — `_id: "entry:<uuid>"`

- `type: "entry"`, `seriesId: string`
- `entryType`: `"point_label" | "point_number" | "span_start" | "span_end"`
- `timestamp` (ISO), `label?: string`, `value?: number`
- `gps?: { lat: number; lng: number; accuracy: number }`
- `startEntryId?: string` — on a `span_end`, references its `span_start`
- `createdAt`, `updatedAt`

**Open span** = a `span_start` with no `span_end` referencing it (and vice versa) →
highlighted on the card and surfaced on the dashboard.

Tags are stored inline on the series; the global tag list is derived by scanning all
series (sufficient for MVP, no separate tag docs).

---

## Phase 1 — Local-first MVP (build + review)

### 1. Dependencies (newest stable)

- `pnpm add pouchdb-browser pouchdb-find date-fns`
- `pnpm add -D @types/pouchdb-browser @types/pouchdb-find`
- Init **shadcn/ui** (`pnpm dlx shadcn@latest init`) — pulls in `clsx`,
  `tailwind-merge`, `class-variance-authority`, `lucide-react`. Add components:
  button, card, dialog, input, textarea, badge, select, popover, label.
- PWA: `pnpm add @serwist/next serwist` (modern, maintained service-worker tooling
  that works with Next 16 App Router).

### 2. Foundation

- `app/globals.css`: add shadcn theme tokens (light/dark CSS variables), keep Tailwind v4
  `@theme inline`.
- `app/layout.tsx`: `lang="de"`, real `metadata` (title "TiDaTra", description),
  link the manifest, apply background/foreground theme.
- `app/manifest.ts`: PWA manifest (name, icons, `display: standalone`, theme color).
- `next.config.ts`: wrap with `withSerwist` for the service worker (offline asset cache).
- `lib/types.ts`, `lib/i18n/en.ts`, `lib/utils.ts`.

### 3. Data layer (`lib/db/`)

- `pouch.ts`: lazily create a `pouchdb-browser` DB **only in the browser** (guard
  `typeof window`); register `pouchdb-find` and create indexes on `type` / `seriesId`.
- `series-repo.ts` / `entries-repo.ts`: typed create/update/delete/get/list. IDs via
  `crypto.randomUUID()`. Always bump `updatedAt`.
- `hooks.ts`: live React hooks backed by PouchDB's `changes()` feed so the UI updates
  reactively. Span helpers: `isOpenSpan(entry, entries)`, `pairSpans(entries)`.

### 4. UI / pages (mostly client components — PouchDB is client-only)

- **Dashboard `app/page.tsx`**: list all series as cards; each card shows title,
  tags, entry count, and an **open-span warning badge**. Series with open spans sorted
  to the top / visually flagged. `SearchBar` (filter by name) + `TagFilter`
  (multi-select chips). Empty state + "Neue Zeitserie" button.
- **Create `app/series/new/page.tsx`**: `SeriesForm` (title, description, `TagInput`
  with create-on-type). Redirect to detail on save.
- **Detail `app/series/[id]/page.tsx`**: `SeriesHeader` (editable title/description/
  tags), `Timeline`, and `EntryList`.
  - `AddEntryDialog`: pick `entryType`; "Now" button (current time) or manual
    date-time picker; optional label; `value` for `point_number`; "Add location"
    using `navigator.geolocation` (graceful when unavailable/denied).
  - Starting a span creates a `span_start`; ending it creates a `span_end` linked via
    `startEntryId`. Open spans are color-highlighted in the list.
  - `EntryItem`: inline edit of timestamp / label / value.
- **Timeline (`components/timeline/`)**: horizontal axis whose start/end scale
  dynamically from the entries' min/max timestamp and the current time. Points render
  as markers; spans render as bars (open spans extend to "now" with a distinct color).
  Clicking the axis opens `AddEntryDialog` pre-filled with the clicked timestamp.

### 5. Quality

- UI strings centralized in `lib/i18n/en.ts` (locale-ready for future translations).
- Mobile-first responsive layout (PWA install target).
- `pnpm lint` clean; `pnpm build` succeeds.

---

## Phase 2 — Authentication (after Phase 1 review)

- Install & configure `better-auth`: providers Google, GitHub, Authentik (generic
  OIDC), and magic link via Resend. SQLite store (`DATABASE_URL`, already in
  `.env.example`).
- `app/api/auth/[...all]/route.ts`, session provider, login page, header account menu.
- App remains fully usable logged-out.

## Phase 3 — Backend-mediated CouchDB sync ✓

### What was built

- **`lib/couch.ts`** (server-only) — CouchDB HTTP client.
  - `userDbName(userId)` — sanitises the user ID into a valid CouchDB database
    name (`tidatra_<sanitized-id>`). Each user gets an isolated database.
  - `ensureUserDb(userId)` — creates the per-user database on first sync (PUT,
    idempotent with 412 handling).
  - `getChangesSince(userId, since)` — incremental pull via the `_changes` feed
    (sequence-based). Returns only live `series` and `entry` docs with CouchDB
    `_rev` stripped so the client's PouchDB revision is never contaminated.
  - `putDocs(userId, docs)` — push with last-write-wins on `updatedAt`. Fetches
    existing CouchDB revs via `_all_docs` to perform in-process LWW before
    calling `_bulk_docs`.
  - Configured via `COUCHDB_URL` (base URL), `COUCHDB_USER`, `COUCHDB_PASSWORD`.

- **`app/api/sync/route.ts`** — Next.js API route, auth-gated.
  - `GET /api/sync?since=<seq>` — pull: calls `getChangesSince`, returns
    `{ docs, lastSeq }`.
  - `POST /api/sync` — push: validates body, calls `putDocs`, returns
    `{ accepted, skipped }`.

- **`lib/db/sync.ts`** (client) — sync engine.
  - `lastWriteWins(incoming, existing)` — pure comparison helper.
  - `claimLocalSeries(userId)` — assigns `ownerId` to any Series docs still
    `null` (guest → account migration on first login).
  - `applyPulledDocs(db, docs)` — merges pulled docs into local PouchDB with
    LWW; handles both inserts (new docs) and updates (preserves local `_rev`).
  - `runSync(userId)` — orchestrates the full cycle: claim → push → pull →
    apply → save checkpoint. Checkpoint doc `sync:checkpoint` stored in local
    PouchDB carries `lastSync` (ISO, for push filtering) and `lastSeq` (CouchDB
    sequence, for incremental pull). Resets on account change.

- **`components/app-header.tsx`** — triggers `runSync` on session change (login)
  and on the browser `online` event. Shows a subtle spinner / checkmark / error
  icon in the header while syncing.

- **Tests** — `lib/db/sync.test.ts` (14 tests) and `lib/couch.test.ts` (4 tests).
  A `test/server-only-stub.ts` stubs `server-only` so `lib/couch.ts` is
  importable in Vitest. `vitest.config.ts` aliases `server-only` to the stub.

### Key design decisions

- **Per-user CouchDB databases** (`tidatra_<userId>`) isolate data and make
  permission enforcement trivial.
- **No direct client ↔ CouchDB communication.** All sync goes through
  `/api/sync`; the server enforces authentication and per-user scoping.
- **Sequence-based incremental pull** (`_changes` feed) is reliable and handles
  deletions correctly in the future.
- **Timestamp-based push filtering** (`updatedAt > lastSync`) keeps push payloads
  small on subsequent syncs.

## Phase 4 — Sharing

- Share a series by email, `read-only` or `editable` (`shares[]` on the series doc).
- `/api/sync` filters per user: owners + shared recipients receive the series; editable
  vs read-only enforced server-side.
- Dashboard separates "Own" and "Shared" series; read-only series disable editing.

---

## Critical files

- `app/layout.tsx`, `app/page.tsx`, `app/globals.css` — replace boilerplate.
- `next.config.ts` — Serwist wrapper.
- `README.md` / `AGENTS.md` — fix the "UI is in German" notes to say English.
- New: `app/manifest.ts`, `app/series/new/page.tsx`, `app/series/[id]/page.tsx`,
  everything under `components/` and `lib/`.

## Verification (Phase 1)

1. `pnpm dev`, open `http://localhost:3000`.
2. Create a time series with description + tags.
3. Add one entry of each type: point label, point number, span start, span end.
4. Start a span and leave it open → confirm it is highlighted on the detail page and
   the dashboard card shows the open-span badge.
5. Confirm the timeline renders points and span bars and scales to the entries; click
   the timeline axis → AddEntryDialog opens with that timestamp.
6. Add an entry with "Add location" → GPS captured (or gracefully skipped).
7. Filter the dashboard by tag and search by name.
8. Reload the page and (with dev tools offline) reload again → all data persists
   (IndexedDB) and the app works offline.
9. `pnpm lint` and `pnpm build` both pass.
