# Proposal

## Why

The `.devcontainer/` setup is the only documented way to get a local CouchDB, but it is
no longer used, and it adds maintenance: `couchdb:latest`/`mailpit:latest` images, a Node
24 feature that disagrees with the Node 22 runtime in CI and the Dockerfile, and a Claude
Code feature pin. Removing it also shrinks what the upcoming Renovate migration
(`migrate-to-renovate`) has to track.

## What Changes

- **BREAKING (dev workflow only)**: delete `.devcontainer/` (`devcontainer.json`,
  `devcontainer-lock.json`, `docker-compose.yml`). "Reopen in Container" stops working.
- Local CouchDB now comes from the root `docker-compose.yml` (`couchdb:3`, the same
  image production uses), started on its own via a small dev-only compose override that
  publishes port 5984 on `127.0.0.1`.
- Mailpit is dropped. Local magic-link sign-in uses the existing fallback that prints the
  link to the server console when `SMTP_HOST` is unset.
- `.env.example` defaults move from container-network hostnames (`couchdb`, `mailpit`)
  to host values (`http://localhost:5984`, SMTP blank).
- README, AGENTS.md and `.dockerignore` stop referring to the dev container.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ This is a developer-tooling and docs change. App behaviour is unchanged, so the
change sets `skip_specs: true`.

## Impact

- Removed: `.devcontainer/**`
- Added: dev-only compose override file (e.g. `docker-compose.dev.yml`)
- Edited: `.env.example`, `README.md` (Prerequisites, "Start CouchDB", "Environment
  variables for sync"), `AGENTS.md` (Conventions bullet), `.dockerignore`
- Unchanged: `CHANGELOG.md` history, production `docker-compose.yml` behaviour (no port
  mapping is added to it), `lib/couch.ts` (already defaults to `localhost:5984`)
- Contributors who relied on the dev container need Docker (for CouchDB), Node 22 and
  pnpm on the host.
