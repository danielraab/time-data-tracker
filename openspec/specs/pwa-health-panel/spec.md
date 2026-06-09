## ADDED Requirements

### Requirement: Service worker status check

The panel SHALL read the current `navigator.serviceWorker` registration state and display it as one of: `unsupported`, `none`, `installing`, `waiting`, or `active`. The active cache version name (e.g. `tidatra-v2`) SHALL be displayed when available by querying `caches.keys()`.

#### Scenario: Service worker active

- **WHEN** the panel mounts and a service worker registration exists with `active` state
- **THEN** the status badge shows "active" and the detected cache key is shown (e.g. `tidatra-v2`)

#### Scenario: Service worker not registered

- **WHEN** no service worker registration exists
- **THEN** the status badge shows "none"

#### Scenario: Service worker not supported

- **WHEN** `"serviceWorker" in navigator` is `false`
- **THEN** the status badge shows "unsupported" and no further SW checks are shown

#### Scenario: Re-register action

- **WHEN** the user clicks "Re-register"
- **THEN** `navigator.serviceWorker.register("/sw.js")` is called and the status refreshes

### Requirement: Push notification status and test

The panel SHALL display the current `Notification.permission` value (`default`, `granted`, or `denied`). When permission is `default`, a "Request permission" button SHALL be shown. When permission is `granted`, a "Send test notification" button SHALL be shown that fires a local `Notification` immediately.

#### Scenario: Permission not yet requested

- **WHEN** `Notification.permission` is `"default"`
- **THEN** a "Request permission" button is visible; "Send test notification" is not shown

#### Scenario: Permission granted — test notification

- **WHEN** `Notification.permission` is `"granted"` and the user clicks "Send test notification"
- **THEN** a `new Notification("TiDaTra test", { body: "Notifications are working." })` fires and the button shows a brief "Sent" confirmation

#### Scenario: Permission denied

- **WHEN** `Notification.permission` is `"denied"`
- **THEN** the badge shows "denied" and an explanatory note is displayed; no action buttons are shown

#### Scenario: Notifications not supported

- **WHEN** `"Notification" in window` is `false`
- **THEN** the badge shows "unsupported"

### Requirement: Geolocation check

The panel SHALL show the current `navigator.permissions` state for `geolocation` (`prompt`, `granted`, or `denied`). A "Get location" button SHALL trigger `navigator.geolocation.getCurrentPosition()` and display the resolved latitude, longitude, and accuracy (in metres). Elapsed time from click to fix SHALL be shown.

#### Scenario: Geolocation resolves successfully

- **WHEN** the user clicks "Get location" and the browser returns a position
- **THEN** latitude, longitude, and accuracy in metres are displayed, along with elapsed time in milliseconds

#### Scenario: Geolocation denied

- **WHEN** the user denies the geolocation prompt or permission is already `"denied"`
- **THEN** an error message "Permission denied" is displayed

#### Scenario: Geolocation timeout

- **WHEN** `getCurrentPosition` takes longer than 15 seconds
- **THEN** an error message "Timed out" is displayed

#### Scenario: Geolocation not supported

- **WHEN** `"geolocation" in navigator` is `false`
- **THEN** the badge shows "unsupported" and no button is shown

### Requirement: Periodic Background Sync status

The panel SHALL check whether the Periodic Background Sync API is available (`"periodicSync" in ServiceWorkerRegistration.prototype`) and whether the `tidatra-sync` tag is currently registered by calling `registration.periodicSync.getTags()`. A "Register sync" button SHALL be shown when the API is supported but the tag is not yet registered.

#### Scenario: Periodic sync registered

- **WHEN** `periodicSync.getTags()` resolves and includes `"tidatra-sync"`
- **THEN** the badge shows "registered" and no action button is needed

#### Scenario: Periodic sync supported but not registered

- **WHEN** `periodicSync` is supported but `getTags()` does not include `"tidatra-sync"`
- **THEN** the badge shows "not registered" and a "Register sync" button is shown

#### Scenario: Register sync action

- **WHEN** the user clicks "Register sync"
- **THEN** `registration.periodicSync.register("tidatra-sync", { minInterval: SYNC_INTERVAL_MS })` is called and the status refreshes

#### Scenario: Periodic sync not supported

- **WHEN** the `periodicSync` API is not available on the registration
- **THEN** the badge shows "unsupported"

### Requirement: Online/offline status indicator

The panel SHALL display a live `navigator.onLine` badge that updates when the browser fires `online` or `offline` events.

#### Scenario: Device is online

- **WHEN** `navigator.onLine` is `true` at mount or after an `online` event
- **THEN** the badge shows "online"

#### Scenario: Device goes offline

- **WHEN** the browser fires an `offline` event
- **THEN** the badge updates to "offline" without a page reload

### Requirement: PWA install prompt

The panel SHALL capture the `beforeinstallprompt` event and show an "Install app" button when it is available. After the user responds to the install dialog, the button SHALL be hidden.

#### Scenario: Install prompt available

- **WHEN** the browser has queued a `beforeinstallprompt` event and the panel is visible
- **THEN** an "Install app" button is displayed

#### Scenario: Install prompt triggered

- **WHEN** the user clicks "Install app"
- **THEN** `deferredPrompt.prompt()` is called; after the user responds the button is hidden

#### Scenario: Install prompt not available

- **WHEN** no `beforeinstallprompt` event has fired (already installed, unsupported browser, HTTPS not met)
- **THEN** the install section shows "Not available"
