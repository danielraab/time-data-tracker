## Context

TiDaTra is a local-first PWA where data lives in PouchDB in the browser and syncs to a per-user CouchDB database (`tidatra_<userId>`) on the server. There is no shared global database. Series IDs are `series:<uuid>`, entries are `entry:<uuid>` — all stored in the owner's user-scoped DB.

Currently all data is private. A visitor to the app who has no account cannot see any series. The change adds a minimal public-sharing path:
- Owner marks a series public (stored as `isPublic: true` on the Series doc).
- A shareable URL is generated: `/public/[ownerId]/[seriesId]`.
- The page is a server-rendered read-only view that fetches directly from CouchDB using admin credentials — no local PouchDB involved.

## Goals / Non-Goals

**Goals:**
- Allow series owners to publish a series via a shareable URL.
- Serve the public view read-only, server-rendered, without authentication.
- Never sync public series data into a visitor's local PouchDB.
- Stop access immediately when the owner flips `isPublic` back to `false`.

**Non-Goals:**
- Listing/discovering public series (there is no public index).
- Embedding, API tokens, or per-entry access control.
- Public sharing for unsynced (local-only, `ownerId === null`) series — those have no server-side database to read from.
- Comments, reactions, or any write path for visitors.

## Decisions

### D1: URL structure includes ownerId

**Decision:** Share URL is `/public/[ownerId]/[seriesId]`.

Data is sharded into per-user CouchDB databases. To resolve a series on the server without a global index, the owner's userId must be in the URL. The ownerId is an internal opaque identifier (not the user's email or display name), so it carries no meaningful personal information.

**Alternative considered:** A global `tidatra_public` registry DB mapping `seriesId → ownerId`. Rejected — requires extra infrastructure, write-through logic on toggle, and cleanup on delete. The URL approach adds zero infrastructure.

### D2: Public data is fetched server-side, never via PouchDB

**Decision:** The public Next.js page is a Server Component that calls a new `getPublicSeriesData(ownerId, seriesId)` function in `lib/couch.ts`. The response is rendered as static HTML. No client-side PouchDB calls are made on the public route.

**Why:** Keeps the local-first invariant — a visitor's browser should not accumulate other users' data. The public view is purely read.

### D3: `isPublic` is stored on the Series PouchDB/CouchDB document

**Decision:** Add `isPublic?: boolean` to the `Series` interface. Toggling it goes through the existing PouchDB `updateSeries` path, which syncs to CouchDB like any other field change.

**Why:** Consistent with how `isArchived`, `maxDurationMinutes`, etc. work. No separate table or document needed. The server API reads this field directly.

**Alternative considered:** A dedicated `series-public` document type. Rejected — extra complexity with no benefit.

### D4: Server API performs the `isPublic` check

**Decision:** `GET /api/public/[ownerId]/[seriesId]` fetches the series from CouchDB, verifies `isPublic === true` and `!deletedAt`, then returns series + entries. Returns 404 for any check failure (no distinction between "not found" and "private" to avoid enumeration).

### D5: Toggle is disabled for unsynced series

**Decision:** The public toggle in the series settings UI is disabled (with explanatory text) when `series.ownerId === null`. The feature requires the data to exist on the server.

## Risks / Trade-offs

[URL ownerId exposure] → The ownerId is visible in the URL. It is an internal UUID-style ID with no PII. Acceptable trade-off vs. zero additional infrastructure.

[isPublic flag syncs offline] → If a user togates public offline, the flag syncs when they reconnect. In the interim, the server-side CouchDB still has the old value (no public access until sync). This is safe — worst case, there's a brief delay after reconnect before the public URL activates.

[No global discovery] → Public series are only accessible if you have the link. This is intentional for the current scope.

[Entry volume] → The API fetches all entries for the series in one CouchDB query. For very large series this could be slow, but is acceptable for the MVP.

## Migration Plan

1. Add `isPublic?: boolean` to `Series` type — backwards compatible (existing docs without the field default to private via `!isPublic`).
2. Ship the new API route and public page before the UI toggle — public URLs become valid but nothing is set public yet.
3. Ship the UI toggle — owners can now publish.
4. No rollback complexity: removing `isPublic` support means public URLs 404 again.

## Open Questions

- Should public pages include a "View on TiDaTra" link / attribution? (UX, out of scope for now)
- Should the share URL use the series title slug for readability? (Nice-to-have, can add later without breaking existing URLs)
