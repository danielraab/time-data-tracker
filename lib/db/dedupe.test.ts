import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, destroyTestDb } from "@/test/db-fixture";
import { getDb } from "./pouch";
import {
  normalize,
  logicalSeriesKey,
  logicalEntryKey,
  pickCanonical,
  planDedupe,
  summarizePlan,
  applyDedupe,
} from "./dedupe";
import type { Entry, Series } from "@/lib/types";

function series(id: string, over: Partial<Series> = {}): Series {
  return {
    _id: id,
    type: "series",
    title: "Work",
    description: "",
    tags: [],
    ownerId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function entry(id: string, over: Partial<Entry> = {}): Entry {
  return {
    _id: id,
    type: "entry",
    seriesId: "series:a",
    entryType: "point_label",
    timestamp: "2026-01-01T08:00:00.000Z",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

describe("normalize", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalize("  Hello   World  ")).toBe("hello world");
    expect(normalize(undefined)).toBe("");
  });
});

describe("logical keys", () => {
  it("treats series with same title/desc/tags (any tag order) as equal", () => {
    const a = series("series:a", { tags: ["x", "y"] });
    const b = series("series:b", { tags: ["y", "x"] });
    expect(logicalSeriesKey(a)).toBe(logicalSeriesKey(b));
  });

  it("distinguishes series with different titles", () => {
    expect(logicalSeriesKey(series("series:a", { title: "Work" }))).not.toBe(
      logicalSeriesKey(series("series:b", { title: "Sleep" })),
    );
  });

  it("keys entries by canonical series, timestamp, type, label, value", () => {
    const a = entry("entry:a", { seriesId: "series:dup", label: "Run" });
    const b = entry("entry:b", { seriesId: "series:canon", label: "Run" });
    // Same canonical series id passed in => same logical key despite differing seriesId.
    expect(logicalEntryKey(a, "series:canon")).toBe(
      logicalEntryKey(b, "series:canon"),
    );
  });
});

describe("pickCanonical", () => {
  it("prefers earliest createdAt", () => {
    const older = series("series:b", { createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = series("series:a", { createdAt: "2026-02-01T00:00:00.000Z" });
    expect(pickCanonical([newer, older])._id).toBe("series:b");
  });

  it("tie-breaks on smallest _id when createdAt is equal", () => {
    const x = series("series:y");
    const y = series("series:x");
    expect(pickCanonical([x, y])._id).toBe("series:x");
  });
});

// ---------------------------------------------------------------------------
// planDedupe
// ---------------------------------------------------------------------------

describe("planDedupe", () => {
  it("returns no groups when there are no duplicates", () => {
    const plan = planDedupe(
      [series("series:a", { title: "Work" }), series("series:b", { title: "Gym" })],
      [entry("entry:a", { seriesId: "series:a" })],
    );
    expect(plan.seriesGroups).toHaveLength(0);
    expect(plan.entryGroups).toHaveLength(0);
  });

  it("groups duplicate series and remaps the duplicate id to the canonical", () => {
    const sA = series("series:a", { createdAt: "2026-01-01T00:00:00.000Z" });
    const sB = series("series:b", { createdAt: "2026-02-01T00:00:00.000Z" });
    const plan = planDedupe([sA, sB], []);
    expect(plan.seriesGroups).toHaveLength(1);
    expect(plan.seriesGroups[0].canonical._id).toBe("series:a");
    expect(plan.seriesIdRemap.get("series:b")).toBe("series:a");
  });

  it("collapses entries that differ only by their duplicated parent series", () => {
    const sA = series("series:a", { createdAt: "2026-01-01T00:00:00.000Z" });
    const sB = series("series:b", { createdAt: "2026-02-01T00:00:00.000Z" });
    const eA = entry("entry:a", {
      seriesId: "series:a",
      createdAt: "2026-01-01T08:00:00.000Z",
    });
    const eB = entry("entry:b", {
      seriesId: "series:b",
      createdAt: "2026-02-01T08:00:00.000Z",
    });
    const plan = planDedupe([sA, sB], [eA, eB]);
    expect(plan.entryGroups).toHaveLength(1);
    expect(plan.entryGroups[0].canonical._id).toBe("entry:a");
    expect(plan.entryGroups[0].duplicates.map((d) => d._id)).toEqual(["entry:b"]);
  });

  it("ignores soft-deleted docs", () => {
    const sA = series("series:a");
    const sB = series("series:b", { deletedAt: "2026-03-01T00:00:00.000Z" });
    const plan = planDedupe([sA, sB], []);
    expect(plan.seriesGroups).toHaveLength(0);
  });
});

describe("summarizePlan", () => {
  it("counts duplicate docs and groups", () => {
    const sA = series("series:a", { createdAt: "2026-01-01T00:00:00.000Z" });
    const sB = series("series:b", { createdAt: "2026-02-01T00:00:00.000Z" });
    const sC = series("series:c", { createdAt: "2026-03-01T00:00:00.000Z" });
    const plan = planDedupe([sA, sB, sC], []);
    const summary = summarizePlan(plan);
    expect(summary.seriesGroupCount).toBe(1);
    expect(summary.duplicateSeries).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// applyDedupe (against an in-memory db)
// ---------------------------------------------------------------------------

describe("applyDedupe", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("soft-deletes duplicate series and repoints entries to the canonical", async () => {
    const db = await getDb();
    await db.bulkDocs([
      series("series:a", { createdAt: "2026-01-01T00:00:00.000Z" }),
      series("series:b", { createdAt: "2026-02-01T00:00:00.000Z" }),
      entry("entry:keep", {
        seriesId: "series:b",
        timestamp: "2026-01-01T09:00:00.000Z",
        createdAt: "2026-01-01T09:00:00.000Z",
      }),
    ]);

    const plan = planDedupe(
      [
        series("series:a", { createdAt: "2026-01-01T00:00:00.000Z" }),
        series("series:b", { createdAt: "2026-02-01T00:00:00.000Z" }),
      ],
      [
        entry("entry:keep", {
          seriesId: "series:b",
          timestamp: "2026-01-01T09:00:00.000Z",
          createdAt: "2026-01-01T09:00:00.000Z",
        }),
      ],
    );
    const result = await applyDedupe(plan);
    expect(result.duplicateSeries).toBe(1);

    const dupSeries = (await db.get("series:b")) as Series;
    expect(dupSeries.deletedAt).toBeTruthy();
    const movedEntry = (await db.get("entry:keep")) as Entry;
    expect(movedEntry.seriesId).toBe("series:a");
  });

  it("repoints startEntryId from a duplicate span_start to the canonical", async () => {
    const db = await getDb();
    // Two logically-identical span_starts (same series/time/type/label).
    const startCanon = entry("entry:start-a", {
      entryType: "span_start",
      timestamp: "2026-01-01T08:00:00.000Z",
      createdAt: "2026-01-01T08:00:00.000Z",
    });
    const startDup = entry("entry:start-b", {
      entryType: "span_start",
      timestamp: "2026-01-01T08:00:00.000Z",
      createdAt: "2026-01-02T08:00:00.000Z",
    });
    const end = entry("entry:end", {
      entryType: "span_end",
      timestamp: "2026-01-01T10:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
      startEntryId: "entry:start-b", // references the duplicate
    });
    await db.bulkDocs([startCanon, startDup, end]);

    const plan = planDedupe([], [startCanon, startDup, end]);
    await applyDedupe(plan);

    const movedEnd = (await db.get("entry:end")) as Entry;
    expect(movedEnd.startEntryId).toBe("entry:start-a");
    const deletedStart = (await db.get("entry:start-b")) as Entry;
    expect(deletedStart.deletedAt).toBeTruthy();
  });

  it("is a no-op for an empty plan", async () => {
    const plan = planDedupe([], []);
    const result = await applyDedupe(plan);
    expect(result.written).toBe(0);
  });
});
