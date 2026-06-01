## 1. Trash Data Helpers

- [x] 1.1 Add helpers to list soft-deleted series and entries separately from active lists.
- [x] 1.2 Add a helper that computes purge eligibility from `deletedAt` using a 30-day retention window.
- [x] 1.3 Add a helper that groups a deleted series with its child entries for trash display and purge cascades.

## 2. Trash UI

- [x] 2.1 Add a dedicated trash route or panel for deleted series and entries.
- [x] 2.2 Show deletion metadata in the trash view, including deleted time, age, and purge eligibility.
- [x] 2.3 Surface edit, restore, and purge actions for each trash item.
- [x] 2.4 Show the parent series on deleted entries and the child-entry count on deleted series.

## 3. Edit and Restore Flows

- [x] 3.1 Allow soft-deleted series and entries to be edited without clearing `deletedAt`.
- [x] 3.2 Add explicit restore actions that clear `deletedAt` and move items back into the active views.
- [x] 3.3 Preserve the existing cascade rule so soft-deleting a series also soft-deletes its entries.

## 4. Purge Plumbing

- [x] 4.1 Add local hard-delete helpers for series and entries that remove records older than 30 days.
- [x] 4.2 Add server-side purge support so old soft-deleted docs are removed from the per-user CouchDB database too.
- [x] 4.3 Ensure purging a series also purges its child entries in the same pass.
- [x] 4.4 Add owner checks so destructive delete/purge actions are limited to the owner.

## 5. Automatic Flush

- [x] 5.1 Run the purge scan from the existing sync/login lifecycle.
- [x] 5.2 Ensure the flush is best-effort and does not block normal sync when there is nothing to purge.
- [x] 5.3 Keep soft-delete replication behavior unchanged for items that are still inside the 30-day retention window.

## 6. Verification

- [x] 6.1 Add unit tests for purge-age helpers and trash grouping logic.
- [x] 6.2 Add tests covering series-cascade purge behavior.
- [x] 6.3 Add tests covering owner-only destructive actions.
- [x] 6.4 Run `pnpm lint` and `pnpm test` after implementation.
