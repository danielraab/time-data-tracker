## Context

TiDaTra is an offline-first PWA backed by PouchDB in the browser and CouchDB on the server. The service worker (`public/sw.js`) currently only handles caching and fetch strategies — no background processing. Sync is driven by `lib/db/sync.ts` which is a manual pull/push cycle over HTTP using a custom checkpoint mechanism. Auth is managed by better-auth. Series are stored in PouchDB with the `Series` type defined in `lib/types.ts`.

The two capabilities being added are largely independent:

1. **PWA Background Sync** — fires the existing sync logic from the service worker every 30 min, with no user in the foreground.
2. **Series Max Duration** — a domain feature touching data model, form UI, list rendering, and PWA notifications.

## Goals / Non-Goals

**Goals:**
- Register a Periodic Background Sync with a `minInterval` of 30 minutes.
- Run the existing PouchDB↔CouchDB sync from within the service worker when the background sync event fires (requires the SW to call the `/api/sync` endpoint, since PouchDB cannot run in a SW context).
- Add `maxDurationMinutes?: number` to the `Series` type and persist it.
- Expose a numeric input in the series create/edit form.
- Visually flag closed durations that exceeded the max in red.
- Add a discrete red-blinking indicator to open durations that have exceeded the max.
- Send a PWA push notification (local, no server push) from a `setInterval` / Periodic Sync check when an open duration crosses the threshold.

**Non-Goals:**
- Server-side push notifications (no VAPID keys or push subscriptions in this change).
- Background sync for browsers that do not support the Periodic Background Sync API (graceful degradation only).
- Editing existing closed entries retroactively.
- Max-duration enforcement — the field is advisory, not a hard limit.

## Decisions

### D1 — Background sync via `/api/sync` from the SW

The existing `sync.ts` module uses PouchDB which is not available in a service worker context. Instead, the SW calls `fetch('/api/sync')` (the already-existing sync route at `app/api/sync/route.ts`) when the `periodicsync` event fires with tag `tidatra-sync`. The route handles auth via cookies, so no extra credentials need to be passed from the SW.

**Alternative considered**: Run CouchDB replication directly from SW using PouchDB-over-HTTP — rejected because it would require PouchDB to be bundled into the SW and would duplicate the checkpoint logic.

### D2 — Periodic Background Sync registration in the client

The `periodicsync` registration must happen in a client component after the user grants notification/background-sync permission. It is best placed in `pwa/service-worker-register.tsx` which already exists and registers the SW. Registration only makes sense when the user is signed in (sync needs an account); we check `useSession()` or a similar auth-client hook before registering.

**Alternative considered**: Register in the SW `activate` handler — rejected because registration requires calling `navigator.permissions.query` and `periodicSync.register` which are main-thread APIs.

### D3 — Notification from the client (not the SW)

The Periodic Background Sync API only fires the SW. To check open-duration thresholds we would need to read PouchDB from the SW, which is not straightforward. Instead:
- A client-side `setInterval` (1-minute tick) checks open durations against `maxDurationMinutes` while the app is in the foreground.
- The SW `periodicsync` handler also reads open durations via a dedicated API route (`/api/notify-overrun`) and triggers a SW notification for background checks.

This hybrid approach covers both foreground and background cases.

**Alternative considered**: Only foreground checks — rejected because a key use case is the user having the app closed while a duration runs.

### D4 — Red/blinking UI via Tailwind classes

Overrun closed durations: `text-red-600` (or `dark:text-red-400`) applied to the duration-display element.
Open overrun durations: a small animated dot using `animate-pulse bg-red-500` inside the open-start item component — discrete, not distracting.

No new dependencies needed; Tailwind's built-in `animate-pulse` covers the blinking requirement.

### D5 — `maxDurationMinutes` is optional, stored on the Series doc

Adding a nullable field to `Series` is backward-compatible with PouchDB and CouchDB replication. Old docs without the field simply behave as if no limit is set.

### D6 — Notification deduplication

To avoid sending a notification every minute once a duration goes overrun, a `localStorage` key `overrun:<seriesId>:<startEntryId>` is set when a notification fires. It is cleared when the duration is closed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Periodic Background Sync is Chromium-only (Chrome/Edge/Android Chrome) | Degrade gracefully: register only if `'periodicSync' in registration`; no UI surfaces this as a feature on unsupported browsers |
| SW calling `/api/sync` while user is not logged in will get 401 | SW checks the response status; silently skips on 401/non-2xx |
| Notification permission not granted | Check `Notification.permission` before creating notifications; degrade silently |
| `localStorage` not accessible in SW | `localStorage` deduplication is only for the foreground interval; SW deduplication uses a separate IndexedDB flag or simply relies on the fact that background sync fires at most once per `minInterval` |
| PouchDB doc size growing if `maxDurationMinutes` is validated client-side only | Acceptable — the field is advisory and the value is small |

## Migration Plan

1. Deploy updated `lib/types.ts` and `lib/db/series-repo.ts` — existing docs remain valid (field is optional).
2. Deploy updated `public/sw.js` — existing SW is replaced on next activation; no cache busting needed beyond incrementing `CACHE` version if shell changes.
3. No database migration needed.
4. Rollback: revert SW and type changes; existing data is unaffected.

## Open Questions

- Should `maxDurationMinutes` be editable after the series is created? **Yes** — include in an edit form (the series-detail page already has an edit path; the form component should handle both create and edit).
- Minimum granularity: minutes only, or also hours? **Minutes only** for simplicity; the input is a plain number field labeled "minutes".
