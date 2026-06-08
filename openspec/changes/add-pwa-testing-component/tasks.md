## 1. Translations

- [x] 1.1 Add `pwaTest` namespace to `lib/i18n/en.ts` with all strings: section title, subsection labels (serviceWorker, notifications, geolocation, periodicSync, online, installPrompt), badge values (active, installing, waiting, none, unsupported, granted, denied, default, registered, notRegistered, online, offline, available, notAvailable), and button labels (reRegister, requestPermission, sendTestNotification, getLocation, registerSync, installApp)

## 2. PwaHealthPanel component

- [x] 2.1 Create `components/pwa/pwa-health-panel.tsx` as a `"use client"` component with a `PwaHealthPanel` export; scaffold the `Card` shell with `CardHeader` / `CardContent` using the existing maintenance-page card pattern
- [x] 2.2 Implement service worker subsection: on mount read `navigator.serviceWorker.getRegistration()`, derive state (unsupported / none / installing / waiting / active), read `caches.keys()` for the cache version string, and wire the "Re-register" button to call `navigator.serviceWorker.register("/sw.js")` then refresh state
- [x] 2.3 Implement notifications subsection: read `Notification.permission`, show "Request permission" button when `default`, show "Send test notification" button when `granted` (fires `new Notification("TiDaTra test", { body: "Notifications are working." })` with a brief "Sent" confirmation), handle `unsupported` when `"Notification" in window` is false
- [x] 2.4 Implement geolocation subsection: read `navigator.permissions.query({ name: "geolocation" })` for the permission badge, wire "Get location" button to call `navigator.geolocation.getCurrentPosition()` with `timeout: 15000`, display resolved lat/lon/accuracy and elapsed time; show error message on denial or timeout; show `unsupported` when `"geolocation" in navigator` is false
- [x] 2.5 Implement periodic background sync subsection: after obtaining the SW registration, check for `"periodicSync" in registration`, call `registration.periodicSync.getTags()` to check for `"tidatra-sync"`, show "Register sync" button when supported but not registered (calls `periodicSync.register("tidatra-sync", { minInterval: SYNC_INTERVAL_MS })` from `lib/db/sync-context`); handle missing `getTags` gracefully
- [x] 2.6 Implement online/offline subsection: initialise from `navigator.onLine`, attach `window.addEventListener("online", ...)` and `window.addEventListener("offline", ...)` in `useEffect` (clean up on unmount)
- [x] 2.7 Implement install prompt subsection: attach `beforeinstallprompt` listener in `useEffect`, store the deferred event in a ref, show "Install app" button when available, call `deferredPrompt.prompt()` on click and hide the button after user responds; show "Not available" when no event has fired
- [x] 2.8 Add a dev-mode note (visible when `process.env.NODE_ENV !== "production"`) explaining that the service worker is not registered in development

## 3. Maintenance page integration

- [x] 3.1 Import `PwaHealthPanel` in `app/maintenance/page.tsx` and render it below the existing `ComparisonCard`

## 4. Verification

- [x] 4.1 Run `pnpm lint` and fix any TypeScript / ESLint errors
- [x] 4.2 Manually open `/maintenance` in the browser, verify each subsection renders with correct initial state, and test each action button
