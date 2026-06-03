# TiDaTra – Time & Data Tracker

TiDaTra is an offline-first Progressive Web App for recording **time series**: named
collections of timestamped entries. Track points in time, durations (start/end), and
numeric values — with optional GPS location and tags — then view everything on a dynamic
timeline.

It works **without an account**: data is stored locally in your browser. If you log in,
your data is synchronised to the server and across your devices.

## Features

- **Offline-first PWA** – usable without a connection; syncs when online and signed in.
- **No login required** – start tracking immediately; data lives in the browser.
- **Optional accounts** – sign in via OAuth provider or magic link to sync and share.
- **Time series** – each series has a title, description, tags, and entries.
- **Entry types**
  - Point in time with a label
  - Point in time with a numeric value
  - Duration start (label names the duration)
  - Duration end
- **Open durations** – a series with a start but no end (or vice versa) is highlighted
  and surfaced on the dashboard.
- **Timestamps** – capture "now" with one tap, or pick/edit any time afterwards.
- **GPS** – entries can optionally record the browser's location when available.
- **Tags** – create and assign one or more tags per series; filter and search by them.
- **Sharing** – share a series with other users by email, read-only or editable.
- **Timeline view** – entries shown on a timeline whose start/end scale dynamically;
  click the timeline to add a new entry.

> The app interface is in English. UI strings live in [`lib/i18n/en.ts`](lib/i18n/en.ts) so additional locales can be added later.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **better-auth** – OAuth providers, Authentik (OIDC), and magic-link email
- **PouchDB** (browser storage) syncing to **CouchDB** (server)
- **pnpm** package manager

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- A CouchDB instance (the included dev container provides one — see below)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example file and fill in the values you need:

```bash
cp .env.example .env
```

For purely local development you only need `DATABASE_URL` (defaults to a local SQLite
file) and `BETTER_AUTH_SECRET`. OAuth and email values are optional — leave them blank to
disable those sign-in methods.

### 3. Start CouchDB

A CouchDB service is included in the dev container (`.devcontainer/docker-compose.yml`)
and runs automatically on `http://localhost:5984` (user `admin`, password `password`).
If you are not using the dev container, run your own CouchDB instance and point
`COUCHDB_URL` at it.
Couchdb GUI is available under: http://localhost:5984/\_utils

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command      | Description                  |
| ------------ | ---------------------------- |
| `pnpm dev`   | Start the development server |
| `pnpm build` | Production build             |
| `pnpm start` | Run the production build     |
| `pnpm lint`  | Run ESLint                   |
| `pnpm test`  | Run the Vitest test suite    |

## Self-hosting

The included `docker-compose.yml` runs the app and CouchDB together. No separate
database server or build step is required — just Docker and a `.env` file.

### Prerequisites

- Docker Engine 24+ with the Compose plugin (`docker compose`)

### 1. Create a `.env` file

```bash
# Public URL of your instance (used for OAuth callbacks and magic-link emails)
BETTER_AUTH_URL=https://tidatra.your-domain.com

# At least 32 random characters — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=<generated-secret>

# CouchDB credentials (same value used by both services)
COUCHDB_USER=admin
COUCHDB_PASSWORD=<strong-password>

# Optional: pin a specific image tag (default: 1.1)
# TIDATRA_TAG=1.1

# Optional: change the published port (default: 3000)
# TIDATRA_PORT=3000
```

For **magic-link email** sign-in, add SMTP credentials:

```bash
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false          # true for implicit TLS on port 465
SMTP_USER=user@your-domain.com
SMTP_PASS=<smtp-password>
SMTP_FROM=TiDaTra <no-reply@your-domain.com>
```

For **OAuth providers**, add whichever you need:

```bash
# GitHub — OAuth App: https://github.com/settings/developers
# Callback URL: ${BETTER_AUTH_URL}/api/auth/callback/github
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google — https://console.cloud.google.com/apis/credentials
# Callback URL: ${BETTER_AUTH_URL}/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Authentik / any OIDC provider
# Callback URL: ${BETTER_AUTH_URL}/api/auth/oauth2/callback/authentik
AUTHENTIK_CLIENT_ID=
AUTHENTIK_CLIENT_SECRET=
AUTHENTIK_ISSUER=https://auth.your-domain.com/application/o/tidatra
```

### 2. Start the stack

```bash
docker compose up -d
docker compose logs -f   # optional: tail logs
```

The app is now available on `http://localhost:3000` (or the `TIDATRA_PORT` you chose).
Put a reverse proxy (nginx, Caddy, Traefik, …) in front to terminate TLS.

### 3. Update to a newer release

```bash
docker compose pull
docker compose up -d
```

### Services and volumes

| Service   | Container         | Description            |
| --------- | ----------------- | ---------------------- |
| `app`     | `tidatra`         | Next.js application    |
| `couchdb` | `tidatra-couchdb` | CouchDB 3 sync backend |

| Volume         | Mounted at          | Contents              |
| -------------- | ------------------- | --------------------- |
| `tidatra-data` | `/app/data`         | SQLite auth database  |
| `couchdb-data` | `/opt/couchdb/data` | All CouchDB databases |

## Project status

| Phase | Description                                                                | Status      |
| ----- | -------------------------------------------------------------------------- | ----------- |
| 1     | Local-first MVP (PouchDB, dashboard, series, entries, timeline, PWA)       | ✅ complete |
| 2     | Authentication (better-auth: magic link, GitHub, Google, Authentik OIDC)   | ✅ complete |
| 3     | Backend-mediated CouchDB sync (push/pull via `/api/sync`, LWW, checkpoint) | ✅ complete |
| 4     | Sharing (share a series by email, read-only or editable)                   | planned     |

### Environment variables for sync

Copy `.env.example` to `.env` and set the CouchDB vars:

```
COUCHDB_URL=http://localhost:5984   # base URL — no database path
COUCHDB_USER=admin
COUCHDB_PASSWORD=password
```

The dev container provides CouchDB on `localhost:5984` with these credentials.
The server creates a per-user database (`tidatra_<userId>`) automatically on
first sync.
