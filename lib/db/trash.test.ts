import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, destroyTestDb } from "../../test/db-fixture";
import { createEntry, listAllEntries } from "./entries-repo";
import {
  createSeries,
  deleteSeries,
  listAllSeries,
} from "./series-repo";
import {
  getDeletionAgeDays,
  groupTrashItems,
  isPurgeEligible,
  isOwner,
  listDeletedEntries,
  listDeletedSeries,
  PURGE_RETENTION_DAYS,
} from "./trash";
import { purgeSeries } from "./series-repo";
import { purgeEntry, restoreEntry } from "./entries-repo";
import { restoreSeries } from "./series-repo";

// --- pure helpers ---

describe("isPurgeEligible", () => {
  it("returns false when item is inside the retention window", () => {
    const deletedAt = "2026-05-01T00:00:00.000Z";
    const now = "2026-05-15T00:00:00.000Z"; // 14 days later
    expect(isPurgeEligible(deletedAt, now)).toBe(false);
  });

  it("returns false when exactly at boundary", () => {
    const deletedAt = "2026-05-01T00:00:00.000Z";
    const now = "2026-05-31T00:00:00.000Z"; // exactly 30 days
    expect(isPurgeEligible(deletedAt, now)).toBe(false);
  });

  it("returns true when item is beyond the retention window", () => {
    const deletedAt = "2026-05-01T00:00:00.000Z";
    const now = "2026-06-01T00:00:00.000Z"; // 31 days later
    expect(isPurgeEligible(deletedAt, now)).toBe(true);
  });

  it(`uses ${PURGE_RETENTION_DAYS}-day window`, () => {
    const deletedAt = "2026-01-01T00:00:00.000Z";
    const justOver = new Date(
      new Date(deletedAt).getTime() + (PURGE_RETENTION_DAYS * 24 * 60 * 60 * 1000) + 1,
    ).toISOString();
    expect(isPurgeEligible(deletedAt, justOver)).toBe(true);
  });
});

describe("getDeletionAgeDays", () => {
  it("returns 0 for same-day deletion", () => {
    const deletedAt = "2026-06-01T10:00:00.000Z";
    const now = "2026-06-01T20:00:00.000Z";
    expect(getDeletionAgeDays(deletedAt, now)).toBe(0);
  });

  it("returns whole days (floor)", () => {
    const deletedAt = "2026-06-01T00:00:00.000Z";
    const now = "2026-06-03T12:00:00.000Z"; // 2.5 days → 2
    expect(getDeletionAgeDays(deletedAt, now)).toBe(2);
  });
});

describe("isOwner", () => {
  it("returns true when ownerId is null (local-only doc)", () => {
    expect(isOwner(null, null)).toBe(true);
    expect(isOwner(null, "user123")).toBe(true);
  });

  it("returns true when userId matches ownerId", () => {
    expect(isOwner("user123", "user123")).toBe(true);
  });

  it("returns false when userId does not match ownerId", () => {
    expect(isOwner("user123", "other")).toBe(false);
    expect(isOwner("user123", null)).toBe(false);
  });
});

// --- db helpers ---

describe("trash grouping helpers", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("listDeletedSeries returns only soft-deleted series", async () => {
    const active = await createSeries({ title: "Active", description: "", tags: [] });
    const toDelete = await createSeries({ title: "Deleted", description: "", tags: [] });
    await deleteSeries(toDelete._id);

    const deleted = await listDeletedSeries();
    expect(deleted.map((s) => s._id)).not.toContain(active._id);
    expect(deleted.find((s) => s._id === toDelete._id)).toBeTruthy();
  });

  it("listDeletedEntries returns only soft-deleted entries", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    const active = await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    await deleteSeries(series._id); // cascade-deletes the entry above

    const deleted = await listDeletedEntries();
    const deletedIds = deleted.map((e) => e._id);
    expect(deletedIds).toContain(active._id);
  });

  it("groupTrashItems places cascade-deleted entries under their series", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
      label: "hi",
    });
    await deleteSeries(series._id);

    const { seriesGroups, standaloneEntries } = await groupTrashItems();
    expect(seriesGroups).toHaveLength(1);
    expect(seriesGroups[0].series._id).toBe(series._id);
    expect(seriesGroups[0].entries).toHaveLength(1);
    expect(standaloneEntries).toHaveLength(0);
  });

  it("groupTrashItems places individually-deleted entries in standaloneEntries", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    const entry = await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    // Delete only the entry, not the series
    const db = await import("./pouch").then((m) => m.getDb());
    const doc = await db.get(entry._id);
    await db.put({ ...doc, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    const { seriesGroups, standaloneEntries } = await groupTrashItems();
    expect(seriesGroups).toHaveLength(0);
    expect(standaloneEntries).toHaveLength(1);
    expect(standaloneEntries[0]._id).toBe(entry._id);
  });
});

// --- series cascade purge ---

describe("series cascade purge", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("purgeSeries removes the series and all its entries from local PouchDB", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    await deleteSeries(series._id);

    await purgeSeries(series._id, null);

    // Neither should appear in listAll (they're hard-deleted)
    const allSeries = await listAllSeries();
    expect(allSeries.find((s) => s._id === series._id)).toBeUndefined();
    const allEntries = await listAllEntries();
    expect(allEntries).toHaveLength(0);
  });

  it("purgeSeries cascades to entries that belong to the series", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    await createEntry({
      seriesId: series._id,
      entryType: "point_number",
      timestamp: "2026-01-02T00:00:00.000Z",
      value: 42,
    });
    await deleteSeries(series._id);

    await purgeSeries(series._id, null);

    const allEntries = await listAllEntries();
    expect(allEntries).toHaveLength(0);
  });

  it("purgeEntry removes a single entry without affecting the series", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    const e1 = await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const e2 = await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-02T00:00:00.000Z",
    });
    // Soft-delete e1 first
    const db = await import("./pouch").then((m) => m.getDb());
    const doc = await db.get(e1._id);
    await db.put({ ...doc, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    await purgeEntry(e1._id);

    const allEntries = await listAllEntries();
    expect(allEntries.find((e) => e._id === e1._id)).toBeUndefined();
    expect(allEntries.find((e) => e._id === e2._id)).toBeTruthy();

    const allSeries = await listAllSeries();
    expect(allSeries.find((s) => s._id === series._id)).toBeTruthy();
  });
});

// --- owner-only destructive actions ---

describe("owner-only destructive actions", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("purgeSeries throws when the caller is not the owner", async () => {
    const db = await import("./pouch").then((m) => m.getDb());
    const series = await createSeries({ title: "S", description: "", tags: [] });
    // Set ownerId to a specific user
    await db.put({
      ...(await db.get(series._id)),
      ownerId: "owner-user",
      updatedAt: new Date().toISOString(),
    });
    await deleteSeries(series._id);

    await expect(purgeSeries(series._id, "other-user")).rejects.toThrow(
      "Not authorized",
    );
  });

  it("purgeSeries succeeds when caller matches ownerId", async () => {
    const db = await import("./pouch").then((m) => m.getDb());
    const series = await createSeries({ title: "S", description: "", tags: [] });
    await db.put({
      ...(await db.get(series._id)),
      ownerId: "owner-user",
      updatedAt: new Date().toISOString(),
    });
    await deleteSeries(series._id);

    await expect(purgeSeries(series._id, "owner-user")).resolves.toBeUndefined();
  });

  it("purgeSeries succeeds for local-only series (ownerId: null) regardless of caller", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    // ownerId is null by default in createSeries
    await deleteSeries(series._id);

    await expect(purgeSeries(series._id, "any-user")).resolves.toBeUndefined();
    await expect(purgeSeries).not.toThrow;
  });
});

// --- restore ---

describe("restore actions", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("restoreSeries clears deletedAt and brings the series back to active views", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    await deleteSeries(series._id);

    const deleted = await listDeletedSeries();
    expect(deleted.find((s) => s._id === series._id)).toBeTruthy();

    await restoreSeries(series._id);

    const deletedAfter = await listDeletedSeries();
    expect(deletedAfter.find((s) => s._id === series._id)).toBeUndefined();
    const { listSeries } = await import("./series-repo");
    const active = await listSeries();
    expect(active.find((s) => s._id === series._id)).toBeTruthy();
  });

  it("restoreEntry clears deletedAt", async () => {
    const series = await createSeries({ title: "S", description: "", tags: [] });
    const entry = await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const db = await import("./pouch").then((m) => m.getDb());
    const doc = await db.get(entry._id);
    await db.put({ ...doc, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    const before = await listDeletedEntries();
    expect(before.find((e) => e._id === entry._id)).toBeTruthy();

    await restoreEntry(entry._id);

    const after = await listDeletedEntries();
    expect(after.find((e) => e._id === entry._id)).toBeUndefined();
  });
});
