## Why

Series are currently private-only, making it impossible to share time-series data with anyone who doesn't have an account. Adding a public flag lets owners publish a series via a shareable URL so anyone can view it read-only — useful for races, public event logs, open datasets, and similar use-cases.

## What Changes

- A series document gains an `isPublic` boolean field (stored on the owner's backend; not exposed in the local PouchDB schema of visitors).
- Owners can toggle public/private from the series settings UI.
- A public series is accessible at `/public/series/[id]` without authentication.
- The public view is fully read-only: no add/edit/delete actions, no auth prompts.
- Public series data is served directly from the server API and must **not** be written into a visitor's local PouchDB — visitors are just reading, not owning the data.
- A public series that is later made private immediately stops being accessible at its URL.

## Capabilities

### New Capabilities

- `series-public-access`: Allows a series to be marked public by its owner, exposes a public read-only URL, and serves the series data via a server API without syncing it into visitors' local databases.

### Modified Capabilities

<!-- No existing spec-level requirements change — sync, soft-delete, and quick-add behaviors are unaffected. -->

## Impact

- **Data model**: `ZeitSerie` document gets `isPublic: boolean` (default `false`).
- **Server API**: New unauthenticated route `GET /api/public/series/[id]` returns series metadata + entries.
- **Routing**: New Next.js page `app/public/series/[id]/page.tsx` — Server Component, no auth guard.
- **Series settings UI**: Toggle control for public/private, copy-link button when public.
- **No PouchDB impact on visitor side**: public data flows server → component only; nothing written locally.
- **Security**: The server must verify `isPublic === true` before returning data; private series must return 404.
