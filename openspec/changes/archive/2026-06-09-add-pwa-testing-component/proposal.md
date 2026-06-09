## Why

The maintenance page already exposes data-sync debugging tools, but there is no way to verify that the PWA itself is healthy — whether the service worker is registered, push notifications are permitted and working, GPS is accessible, and periodic background sync is active. When something silently breaks (e.g. after a browser update or permission reset), developers and power users have no in-app tool to diagnose it.

## What Changes

- Add a collapsible **PWA Health** card to the maintenance page with live status checks and one-shot test actions.
- **Service worker**: shows registration state (none / installing / active), current cache version, and a "Re-register" button.
- **Push notifications**: shows permission state (default / granted / denied), a "Request permission" button when applicable, and a "Send test notification" button that fires a local notification immediately.
- **Geolocation / GPS**: shows permission state, a "Get current location" button that resolves coordinates and displays accuracy, and elapsed time to first fix.
- **Periodic Background Sync**: shows whether `periodicSync` API is supported in this browser and whether the `tidatra-sync` tag is registered; a "Register sync" button if not yet registered.
- **Network / online status**: live indicator (`navigator.onLine`) with `online`/`offline` event listener.
- **Install prompt (PWA install)**: shows whether the browser has queued a `beforeinstallprompt` event and offers an "Install app" button if so.
- All strings added to `lib/i18n/en.ts` under a new `pwaTest` key.

## Capabilities

### New Capabilities

- `pwa-health-panel`: A client-side panel component that aggregates PWA API checks (service worker, notifications, geolocation, periodic sync, online status, install prompt) and surfaces them with status badges and action buttons on the maintenance page.

### Modified Capabilities

<!-- No existing spec-level requirements change. -->

## Impact

- `app/maintenance/page.tsx` — import and render the new `PwaHealthPanel` component.
- `components/pwa/pwa-health-panel.tsx` — new client component (new file).
- `lib/i18n/en.ts` — new `pwaTest` translation namespace.
- No new dependencies required; all APIs are native browser APIs.
- No server-side changes needed.
