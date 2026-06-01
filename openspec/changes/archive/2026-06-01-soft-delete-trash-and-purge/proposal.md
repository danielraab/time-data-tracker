## Why

TiDaTra currently soft-deletes series and entries by setting `deletedAt`, but those records disappear from the normal views and there is no dedicated place to inspect, restore, edit, or permanently remove them. That makes accidental deletions hard to recover from, hides useful deletion metadata, and leaves old tombstones to accumulate indefinitely in the local PouchDB and synced CouchDB databases.

This change introduces a visible trash workflow for soft-deleted series and entries, plus a bounded retention policy: anything soft-deleted for more than 30 days is permanently removed from both local and server stores.

## What Changes

- Add a trash/soft-delete view that lists soft-deleted series and entries.
- Show deletion metadata in that view, including when the doc was deleted and how long remains before it becomes purge-eligible.
- Allow soft-deleted items to be edited and restored from the trash view.
- Preserve the existing cascade behavior where soft-deleting a series also soft-deletes its entries.
- Add an automatic purge pass that hard-deletes any soft-deleted doc older than 30 days.
- Use owner-only authorization for delete/purge actions so shared data cannot be removed by non-owners once sharing exists.
- Keep sync behavior based on `deletedAt` for soft deletes; the purge pass is the separate hard-delete path.

## Capabilities

### New Capabilities

- `soft-delete-trash-view`: A dedicated UI for listing and managing soft-deleted series and entries.
- `soft-delete-purge-policy`: A 30-day retention policy that automatically hard-deletes stale soft-deleted docs.
- `owner-only-deletion-guard`: A permission rule that limits destructive delete/purge actions to the owner of the data.

### Modified Capabilities

- Existing series and entry delete flows: still soft-delete by default, but now feed the trash view and purge policy.
- Existing sync flow: continues to replicate soft-deleted docs through `deletedAt`, while ignoring hard-delete tombstones.

## Impact

- `lib/db/series-repo.ts` and `lib/db/entries-repo.ts` will need trash-aware list helpers and purge-aware delete paths.
- The series and entry UI will need a new trash surface and edit/restore actions.
- The sync and CouchDB layers will need a hard-delete/purge path that removes old soft-deleted docs from both local and server databases.
- The app will need a periodic purge check, likely on login and during foreground sync, so the 30-day retention policy is enforced without requiring a manual action.
