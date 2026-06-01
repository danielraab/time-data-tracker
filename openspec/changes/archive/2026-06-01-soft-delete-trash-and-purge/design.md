## Context

TiDaTra already soft-deletes series and entries by setting `deletedAt`, and the sync layer already replicates those docs as ordinary documents. The app currently filters them out of the main lists, which means there is no dedicated place to inspect deleted data, adjust it, or remove it permanently.

This change adds a trash workflow and a bounded retention policy without changing the existing soft-delete transport: soft-deleted docs continue to sync via `deletedAt`, and hard-deleted tombstones remain an implementation detail of the purge path.

## Goals / Non-Goals

**Goals:**

- Make soft-deleted series and entries visible in a dedicated trash view.
- Allow users to inspect, edit, restore, or permanently delete soft-deleted items from that view.
- Keep series cascades intact: soft-deleting a series also soft-deletes its entries.
- Automatically hard-delete any soft-deleted item older than 30 days.
- Enforce owner-only destructive actions so shared data cannot be purged by non-owners once sharing exists.

**Non-Goals:**

- Replacing the existing soft-delete model with immediate hard deletes.
- Introducing a new sharing model; this change only reserves the ownership guard rails.
- Changing how sync determines freshness or conflict resolution.

## Decisions

### D1 — Trash view is the canonical surface for deleted content

**Decision**: Add a dedicated trash view for soft-deleted series and entries instead of mixing deleted-state toggles into the normal dashboard and detail pages.

**Rationale**: Deleted items share the same lifecycle, age, and purge rules. A single surface makes restore, edit, and purge behavior easier to understand and keeps the main screens focused on active data.

### D2 — Editing a deleted item does not restore it

**Decision**: Editing a soft-deleted series or entry updates its fields but keeps `deletedAt` intact until the user explicitly restores it.

**Rationale**: A save from the trash should not accidentally bring an item back into the active views. Restore remains a separate action so the user controls when the item reappears.

### D3 — Purge eligibility is based on `deletedAt + 30 days`

**Decision**: Use `deletedAt` as the single source of truth for purge timing. The trash view shows the deletion age and whether the item is already eligible for purge.

**Rationale**: The existing schema already carries the necessary timestamp. No extra tombstone bookkeeping is needed.

### D4 — Automatic flush happens in the sync path

**Decision**: Run the purge scan as part of the existing foreground/login sync lifecycle, not as a separate background scheduler.

**Rationale**: Sync already has authenticated user context and network reachability. That makes it the safest place to hard-delete the local docs and tell CouchDB to remove the server copies.

### D5 — Purge uses normal hard delete, not CouchDB `_purge`

**Decision**: Use regular hard-delete operations (`db.remove` locally and a server delete endpoint) rather than CouchDB `_purge`.

**Rationale**: Normal deletes preserve replication semantics and avoid introducing a special-case admin-only path that does not replicate cleanly.

### D6 — Series purge cascades to entries

**Decision**: When a soft-deleted series is purged, all entries belonging to that series are purged in the same cleanup pass.

**Rationale**: The current delete flow already treats entries as children of the series. Purge should mirror that hierarchy so there are no orphaned records.

### D7 — Owner-only destructive actions

**Decision**: Add ownership checks to purge and delete paths so only the owner can permanently remove a record. Shared content remains read-only for non-owners.

**Rationale**: Sharing is not implemented yet, but the deletion policy should already be safe for the future shared-data model.

## Data / UX Shape

```
Active views
  └── filter out deletedAt

Trash view
  ├── Series section
  │   ├── title / description / tags
  │   ├── deletedAt age
  │   ├── purge eligible badge
  │   ├── edit
  │   ├── restore
  │   └── purge
  └── Entries section
      ├── parent series
      ├── timestamp / label / value
      ├── deletedAt age
      ├── purge eligible badge
      ├── edit
      ├── restore
      └── purge
```

The trash view is read from helpers that return deleted series and deleted entries sorted by deletion time. For series, the view should also show the number of associated entries and any child-entry purge impact.

## Risks / Trade-offs

| Risk                                           | Mitigation                                                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Purge runs while offline                       | Run purge only from the authenticated sync path; if offline, the item remains soft-deleted until the next sync opportunity |
| Editing deleted docs could feel confusing      | Keep restore as a distinct action and label edits as trash edits, not restores                                             |
| Series purge leaves behind entries             | Purge series and child entries together in one cleanup pass                                                                |
| Permission checks drift as sharing lands later | Centralize ownership validation in the repo / API layer rather than in view code                                           |
