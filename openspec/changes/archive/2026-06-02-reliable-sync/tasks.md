## 1. Add i18n string

- [x] 1.1 In `lib/i18n/en.ts`, add `syncFailedClear` to the `auth` section:
  ```
  syncFailedClear: "Sync failed. Clear local data anyway? Unsynced changes will be lost."
  ```

## 2. Update the clear-and-sign-out handler in AppHeader

- [x] 2.1 In `components/app-header.tsx`, add imports:
  - `import { runSync } from "@/lib/db/sync";`
  - `import { useState } from "react";` (if not already imported)
- [x] 2.2 Add a `clearingInProgress` state with `useState(false)` inside `AppHeader`.
- [x] 2.3 Replace the current `onSelect` handler of the "Clear data and sign out"
  `DropdownMenuItem` with an async function that:
  1. Sets `clearingInProgress = true`
  2. Tries `await runSync(userId)` (use `session.user.id`)
  3. On failure, calls `window.confirm(t.auth.syncFailedClear)`; if user cancels,
     sets `clearingInProgress = false` and returns
  4. Calls `await destroyDb()`
  5. Calls `signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })`
  6. In a `finally` block, sets `clearingInProgress = false`
- [x] 2.4 Add `disabled={clearingInProgress}` to the "Clear data and sign out"
  `DropdownMenuItem` (use the `disabled` prop).
- [x] 2.5 While `clearingInProgress` is true, show a `LoaderIcon` (already
  imported) before the menu item label, replacing the `LogOutIcon`. Use a
  conditional render.

## 3. Verification

- [x] 3.1 Run `pnpm lint` — confirm no type or lint errors in `app-header.tsx`
  and `en.ts`.
- [x] 3.2 Run `pnpm test` — confirm existing tests still pass (no sync or auth
  test regressions).
- [ ] 3.3 Manual check (happy path): make a change, click "Clear data and sign
  out", log back in — the change is present.
- [ ] 3.4 Manual check (offline path): go offline, click "Clear data and sign
  out" — a confirm dialog appears; clicking Cancel leaves the user signed in with
  data intact; clicking OK clears and signs out.
