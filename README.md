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

## Project status

Early development — the scaffold is in place and features are being built out against the
specification above.
