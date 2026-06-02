import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, destroyTestDb } from "../../test/db-fixture";
import { exportData, importData } from "./transfer";
import type { Series, Entry } from "@/lib/types";

const baseSeries = (overrides: Partial<Series> = {}): Series => ({
  _id: "series:test-1",
  type: "series",
  title: "Test series",
  description: "",
  tags: [],
  ownerId: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const baseEntry = (overrides: Partial<Entry> = {}): Entry => ({
  _id: "entry:test-1",
  type: "entry",
  seriesId: "series:test-1",
  entryType: "point_label",
  timestamp: "2024-01-01T10:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("transfer — exportData", () => {
  beforeEach(async () => {
    const db = await createTestDb();
    const s = baseSeries();
    await db.put(s);
    await db.put(baseEntry({ _id: "entry:test-1", label: "first" }));
    await db.put(baseEntry({ _id: "entry:test-2", label: "second", timestamp: "2024-01-01T11:00:00.000Z" }));
    // soft-deleted entry — should be excluded
    await db.put(baseEntry({
      _id: "entry:test-3",
      label: "deleted",
      deletedAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    }));
  });
  afterEach(destroyTestDb);

  it("returns version 1 and exportedAt", async () => {
    const file = await exportData(["series:test-1"]);
    expect(file.version).toBe(1);
    expect(typeof file.exportedAt).toBe("string");
  });

  it("contains the selected series", async () => {
    const file = await exportData(["series:test-1"]);
    expect(file.series).toHaveLength(1);
    expect(file.series[0]._id).toBe("series:test-1");
  });

  it("strips _rev from exported docs", async () => {
    const file = await exportData(["series:test-1"]);
    expect((file.series[0] as Series & { _rev?: string })._rev).toBeUndefined();
    expect((file.entries[0] as Entry & { _rev?: string })._rev).toBeUndefined();
  });

  it("includes only non-deleted entries", async () => {
    const file = await exportData(["series:test-1"]);
    expect(file.entries).toHaveLength(2);
    expect(file.entries.map((e) => e.label)).toEqual(
      expect.arrayContaining(["first", "second"]),
    );
    expect(file.entries.find((e) => e.label === "deleted")).toBeUndefined();
  });

  it("excludes series not in the selected ids", async () => {
    const file = await exportData(["series:other"]);
    expect(file.series).toHaveLength(0);
    expect(file.entries).toHaveLength(0);
  });
});

describe("transfer — importData insert path", () => {
  beforeEach(createTestDb);
  afterEach(destroyTestDb);

  it("inserts series and entries that do not exist locally", async () => {
    const result = await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries()],
      entries: [baseEntry()],
    });
    expect(result.seriesInserted).toBe(1);
    expect(result.seriesUpdated).toBe(0);
    expect(result.seriesSkipped).toBe(0);
    expect(result.entriesInserted).toBe(1);
  });

  it("docs are retrievable after insert", async () => {
    const { getDb } = await import("./pouch");
    await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries()],
      entries: [baseEntry()],
    });
    const db = await getDb();
    const s = await db.get("series:test-1");
    expect(s._id).toBe("series:test-1");
    const e = await db.get("entry:test-1");
    expect(e._id).toBe("entry:test-1");
  });
});

describe("transfer — importData update path", () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await db.put(baseSeries({ updatedAt: "2024-01-01T00:00:00.000Z" }));
  });
  afterEach(destroyTestDb);

  it("updates when imported updatedAt is newer", async () => {
    const result = await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries({ title: "Updated title", updatedAt: "2025-01-01T00:00:00.000Z" })],
      entries: [],
    });
    expect(result.seriesUpdated).toBe(1);
    expect(result.seriesSkipped).toBe(0);
  });

  it("local doc has the newer updatedAt after update", async () => {
    const { getDb } = await import("./pouch");
    await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries({ title: "Newer", updatedAt: "2025-01-01T00:00:00.000Z" })],
      entries: [],
    });
    const db = await getDb();
    const local = await db.get("series:test-1") as Series;
    expect(local.updatedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(local.title).toBe("Newer");
  });
});

describe("transfer — importData skip path", () => {
  beforeEach(async () => {
    const db = await createTestDb();
    await db.put(baseSeries({ updatedAt: "2025-01-01T00:00:00.000Z" }));
  });
  afterEach(destroyTestDb);

  it("skips when local updatedAt is newer or equal", async () => {
    const result = await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries({ updatedAt: "2024-01-01T00:00:00.000Z" })],
      entries: [],
    });
    expect(result.seriesSkipped).toBe(1);
    expect(result.seriesUpdated).toBe(0);
  });

  it("local doc is unchanged after skip", async () => {
    const { getDb } = await import("./pouch");
    await importData({
      version: 1,
      exportedAt: new Date().toISOString(),
      series: [baseSeries({ title: "Old title", updatedAt: "2024-01-01T00:00:00.000Z" })],
      entries: [],
    });
    const db = await getDb();
    const local = await db.get("series:test-1") as Series;
    expect(local.updatedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(local.title).toBe("Test series");
  });
});
