# Tasks

## 1. Local CouchDB via root compose

- [x] 1.1 Add `docker-compose.dev.yml` that publishes `couchdb` on `127.0.0.1:5984:5984` only; verify `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` shows the port on `couchdb` and none on `app`
- [x] 1.2 Add `db:up` (`… up -d couchdb`) and `db:down` scripts to `package.json`; verify `pnpm db:up` with a `.env` copied from `.env.example` brings CouchDB up and `curl -sf http://localhost:5984/_up` succeeds
- [x] 1.3 Verify plain `docker compose config` (no override) still publishes no CouchDB port

## 2. Environment defaults

- [x] 2.1 In `.env.example`, set `COUCHDB_URL=http://localhost:5984`, blank `SMTP_HOST`/`SMTP_PORT`, and rewrite the dev-container comments to point at `pnpm db:up` and the console magic-link fallback; verify `pnpm dev` + sign-in by magic link prints the link to the console and sync reaches the local CouchDB

## 3. Remove the dev container

- [x] 3.1 Delete `.devcontainer/` and the `.devcontainer` line in `.dockerignore`; verify `git grep -i devcontainer -- ':!CHANGELOG.md' ':!openspec/'` returns nothing

## 4. Docs

- [x] 4.1 README: Prerequisites (Node 22, pnpm via corepack, Docker), "3. Start CouchDB" → `pnpm db:up` + `_utils` URL, "Environment variables for sync" drops the dev-container sentence; verify by reading the Getting started section top to bottom on a clean checkout
- [x] 4.2 AGENTS.md Conventions: replace the dev-container bullet with "Local CouchDB: `pnpm db:up` (root compose + `docker-compose.dev.yml`) on `localhost:5984`"; verify `git grep -n "dev container" AGENTS.md README.md` returns nothing
- [x] 4.3 Add a CHANGELOG entry noting the removal and the new `pnpm db:up` workflow

## 5. Wrap-up

- [x] 5.1 Run `pnpm lint` and `pnpm test`; verify both pass
