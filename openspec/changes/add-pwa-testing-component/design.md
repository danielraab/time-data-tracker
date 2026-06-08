## Context

The maintenance page (`app/maintenance/page.tsx`) is a `"use client"` page that aggregates debugging tools for power users. It currently contains data-deduplication and local/server comparison cards. The PWA infrastructure (service worker at `public/sw.js`, registration in `components/pwa/service-worker-register.tsx`) operates silently; when something breaks — a browser update resets permissions, the SW fails to activate, GPS stops working — there is no visible diagnostic surface.

All APIs involved (`navigator.serviceWorker`, `Notification`, `navigator.geolocation`, periodic background sync, `beforeinstallprompt`) are browser-only and require a `"use client"` component. No server-side logic is needed.

## Goals / Non-Goals

**Goals:**
- Surface live status of each PWA subsystem (SW, notifications, GPS, periodic sync, online, install prompt) with readable badges.
- Provide one-shot test actions for each subsystem (re-register SW, request notification permission, send test notification, get GPS fix, register periodic sync, trigger install prompt).
- Integrate seamlessly into the existing maintenance page layout using the existing `Card` / `CardHeader` / `CardContent` pattern.
- All strings in `lib/i18n/en.ts` under a `pwaTest` key.

**Non-Goals:**
- Continuous polling / live refresh of GPS — one-shot "Get location" is sufficient.
- Persisting test results across page reloads.
- Push API (server-sent push) — the test notification uses the local `Notification` constructor, not the Push API + VAPID, which requires a separate backend setup.
- Changing PWA service worker logic — this panel only reads and tests, it does not modify `public/sw.js`.

## Decisions

### Single-file component vs. extraction

**Decision**: Implement the panel as a single `components/pwa/pwa-health-panel.tsx` component, co-located with the existing `service-worker-register.tsx`.

**Rationale**: All six subsection checks are tightly coupled to browser APIs that only make sense together on this page. Extracting each into a sub-component would add indirection without reuse benefit. The component will be long (~250 lines) but cohesive.

**Alternative considered**: A generic `<PwaCheckRow>` primitive. Rejected because the per-subsystem state shapes differ enough (SW has cache version, GPS has coords + elapsed time) that a generic row would need heavy prop drilling.

### State management

**Decision**: Use independent `useState` + `useEffect` hooks per subsystem rather than a single reducer.

**Rationale**: Each subsystem's async lifecycle is independent. A reducer would complicate reading a single subsystem's state. The component is not shared, so there is no need for a shared store.

### Periodic sync registration in the panel vs. `ServiceWorkerRegister`

**Decision**: The panel calls `periodicSync.register()` directly as a one-shot test action; it does not route through `ServiceWorkerRegister`.

**Rationale**: `ServiceWorkerRegister` is a production path tied to auth state. The panel is a debug tool that needs explicit user intent ("Register sync" button). Calling `register()` from the panel is idempotent — if already registered, calling it again with the same tag and interval is a no-op.

### GPS timeout

**Decision**: Use a 15-second `timeout` option on `getCurrentPosition`.

**Rationale**: Mobile GPS cold-start can take 10–12 seconds. 15 s gives a realistic window while preventing indefinite hangs. The panel shows elapsed time so the user can see the fix was slow.

### Install prompt capture

**Decision**: Attach the `beforeinstallprompt` listener in a `useEffect` on mount.

**Rationale**: The browser fires the event once, early in the page lifecycle. A `useEffect` on mount is early enough for a maintenance page (navigated to after app shell loads). If the event already fired before mount, the button simply won't appear (shows "Not available") — acceptable for a debug tool.

### login gate

**Decision**: No login gate is necessary

**Decision**: PWA APIs are all local and relevant even without an account.

## Risks / Trade-offs

- [Periodic sync `getTags()` missing in some browsers] → Mitigation: wrap in try/catch; if `getTags` is not a function, treat as "unsupported".
- [Notification constructor blocked in service worker context] → N/A here; the panel runs in the main thread, so `new Notification(...)` is valid when permission is `"granted"`.
- [Service worker only registers in production (`NODE_ENV === "production"`)] → The panel reflects this: in development the SW will show "none" or "installing" and that's accurate. A note in the panel clarifies this.
- [GPS on desktop shows low accuracy] → Accuracy is shown verbatim in metres; no minimum threshold is enforced. The user sees what the browser reports.

## Migration Plan

No data migrations. Deployment is a standard Next.js build. The new component is purely additive.

Rollback: revert the import in `app/maintenance/page.tsx` and delete `components/pwa/pwa-health-panel.tsx`.
