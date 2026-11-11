# Design

## Context

See proposal.md (Why). What matters for the approach:

- The root `docker-compose.yml` is the **production** deployment example. Its `couchdb`
  service (`couchdb:3`, healthcheck, named volume `couchdb-data`) has no published port.
  It is only reachable on the internal `tidatra-network`.
- The compose file uses required interpolation (`${BETTER_AUTH_URL:?…}`,
  `${BETTER_AUTH_SECRET:?…}`, `${COUCHDB_PASSWORD:?…}`). Compose interpolates every
  service even when you start only one, so these must resolve. A `.env` copied from
  `.env.example` already provides all three.
- `docker compose` reads `.env` from the project directory, the same file Next.js reads.
  So one `.env` serves both the dev server and the CouchDB container.
- `lib/couch.ts` already falls back to `http://localhost:5984`. The SMTP layer already
  prints magic links to the console when `SMTP_HOST` is unset.

## Goals / Non-Goals

**Goals:**
- One command brings up a local CouchDB on `localhost:5984` using the production image.
- No change to what `docker compose up -d` does for production users.

**Non-Goals:**
- Running the Next.js app itself in a container for development.
- Providing a local mail catcher.
- Replacing the editor settings/extensions that `devcontainer.json` recommended. If they
  are wanted, that's a separate `.vscode/extensions.json` change.

## Decisions

### D1. Dev override file, opted in explicitly with `-f`
Add `docker-compose.dev.yml` that only adds `ports: ["127.0.0.1:5984:5984"]` to
`couchdb`. Usage:

```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d couchdb
```

Wrap it in a `package.json` script (e.g. `pnpm db:up` / `pnpm db:down`) so nobody has to
remember the flags.

*Alternatives:*
- `compose.override.yaml`: Compose loads this automatically. Anyone who clones the repo
  and runs `docker compose up -d` in production would silently get CouchDB published on
  5984. Rejected.
- Add the port directly to the root compose: same exposure problem. Rejected.
- Separate standalone `compose.dev.yml` with its own CouchDB definition: duplicates the
  image tag and healthcheck, so two places to keep in sync. Rejected in favour of
  reusing the production service definition (this was the user's choice, option A).

### D2. Bind to `127.0.0.1`, not `0.0.0.0`
The dev credentials are `admin` / `password`. Publishing on all interfaces would expose
an admin-credentialed CouchDB to the LAN.

### D3. Drop Mailpit; rely on console fallback
The console fallback already exists and covers the only email flow (magic link). Not
having Mailpit means one less image and one less port.

### D4. `.env.example` targets the host
`COUCHDB_URL=http://localhost:5984`, `SMTP_HOST=` (blank) and `SMTP_PORT=` (blank). Update
the comments to describe the `pnpm db:up` workflow instead of the dev container.

## Risks / Trade-offs

- [Dev data in the `couchdb-data` volume shares its name with production's] → It is
  per-machine and per-project-directory (compose prefixes volumes with the project name),
  so a dev laptop doesn't collide with a server. Document `pnpm db:down -v` for a reset.
- [`.env` now feeds both Next.js and Compose] → Compose only uses the interpolated
  variables. The app service is never started in dev, so the extra SMTP/OAuth values are
  harmless.
- [Contributors lose the one-click environment] → Accepted. README covers the
  host prerequisites (Node 22, pnpm via corepack, Docker).

## Migration Plan

1. Land the change. Existing dev-container users keep their old `couchdb-data`
   (devcontainer) volume, but it is under a different compose project name, so they start
   with an empty DB. Acceptable for dev data.
2. Rollback: revert the commit. Nothing outside the repo changes.
