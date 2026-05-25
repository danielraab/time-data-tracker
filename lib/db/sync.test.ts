import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, destroyTestDb } from "@/test/db-fixture";
import { lastWriteWins, applyPulledDocs, claimLocalSeries } from "./sync";
import { createSeries } from "./series-repo";
import { getDb } from "./pouch";
import type { Series, TidatraDoc } from "@/lib/types";

// ---------------------------------------------------------------------------
// lastWriteWins
// ---------------------------------------------------------------------------

describe("lastWriteWins", () => {
  it("accepts when there is no existing doc", () => {
    expect(
      lastWriteWins({ updatedAt: "2026-01-01T00:00:00.000Z" }, undefined),
    ).toBe(true);
  });

  it("accepts when incoming is strictly newer", () => {
    expect(
      lastWriteWins(
        { updatedAt: "2026-01-02T00:00:00.000Z" },
        { updatedAt: "2026-01-01T00:00:00.000Z" },
      ),
    ).toBe(true);
  });

  it("rejects when incoming is older", () => {
    expect(
      lastWriteWins(
        { updatedAt: "2026-01-01T00:00:00.000Z" },
        { updatedAt: "2026-01-02T00:00:00.000Z" },
      ),
    ).toBe(false);
  });

  it("rejects when timestamps are equal (idempotency)", () => {
    const ts = "2026-01-01T00:00:00.000Z";
    expect(lastWriteWins({ updatedAt: ts }, { updatedAt: ts })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyPulledDocs
// ---------------------------------------------------------------------------

describe("applyPulledDocs", () => {
  beforeEach(async () => {
    await createTestDb();
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  it("inserts docs that do not yet exist locally", async () => {
    const db = await getDb();
    const incoming: TidatraDoc[] = [
      {
        _id: "series:aaaaaaaa-0000-0000-0000-000000000001",
        type: "series",
        title: "Remote series",
        description: "",
        tags: [],
        ownerId: "user1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const written = await applyPulledDocs(db, incoming);

    expect(written).toBe(1);
    const stored = (await db.get(
      "series:aaaaaaaa-0000-0000-0000-000000000001",
    )) as Series;
    expect(stored.title).toBe("Remote series");
  });

  it("updates a local doc when the incoming version is newer", async () => {
    const db = await getDb();
    const id = "series:aaaaaaaa-0000-0000-0000-000000000002";
    const local: TidatraDoc = {
      _id: id,
      type: "series",
      title: "Old title",
      description: "",
      tags: [],
      ownerId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await db.put(local);

    const written = await applyPulledDocs(db, [
      { ...local, title: "New title", updatedAt: "2026-01-02T00:00:00.000Z" },
    ]);

    expect(written).toBe(1);
    const stored = (await db.get(id)) as Series;
    expect(stored.title).toBe("New title");
  });

  it("skips a doc when the local version is newer", async () => {
    const db = await getDb();
    const id = "series:aaaaaaaa-0000-0000-0000-000000000003";
    const local: TidatraDoc = {
      _id: id,
      type: "series",
      title: "Local version",
      description: "",
      tags: [],
      ownerId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    };
    await db.put(local);

    const written = await applyPulledDocs(db, [
      { ...local, title: "Old remote", updatedAt: "2026-01-03T00:00:00.000Z" },
    ]);

    expect(written).toBe(0);
    const stored = (await db.get(id)) as Series;
    expect(stored.title).toBe("Local version");
  });

  it("skips a doc when timestamps are equal (idempotency)", async () => {
    const db = await getDb();
    const id = "series:aaaaaaaa-0000-0000-0000-000000000004";
    const ts = "2026-01-01T00:00:00.000Z";
    const local: TidatraDoc = {
      _id: id,
      type: "series",
      title: "Same version",
      description: "",
      tags: [],
      ownerId: null,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.put(local);

    const written = await applyPulledDocs(db, [{ ...local }]);
    expect(written).toBe(0);
  });

  it("handles an empty array without error", async () => {
    const db = await getDb();
    const written = await applyPulledDocs(db, []);
    expect(written).toBe(0);
  });

  it("processes multiple docs in one call", async () => {
    const db = await getDb();
    const incoming: TidatraDoc[] = [
      {
        _id: "series:aaaaaaaa-0000-0000-0000-000000000005",
        type: "series",
        title: "Alpha",
        description: "",
        tags: [],
        ownerId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        _id: "series:aaaaaaaa-0000-0000-0000-000000000006",
        type: "series",
        title: "Beta",
        description: "",
        tags: [],
        ownerId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const written = await applyPulledDocs(db, incoming);
    expect(written).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// claimLocalSeries
// ---------------------------------------------------------------------------

describe("claimLocalSeries", () => {
  beforeEach(async () => {
    await createTestDb();
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  it("assigns ownerId to unclaimed series", async () => {
    const series = await createSeries({
      title: "My series",
      description: "",
      tags: [],
    });
    expect(series.ownerId).toBeNull();

    await claimLocalSeries("user-123");

    const db = await getDb();
    const updated = (await db.get(series._id)) as Series;
    expect(updated.ownerId).toBe("user-123");
  });

  it("does not touch series that already have an owner", async () => {
    const series = await createSeries({
      title: "Owned",
      description: "",
      tags: [],
    });
    const db = await getDb();
    // Manually set ownerId on the just-created series
    await db.put({ ...series, ownerId: "existing-owner" });

    await claimLocalSeries("new-owner");

    const updated = (await db.get(series._id)) as Series;
    expect(updated.ownerId).toBe("existing-owner");
  });

  it("is a no-op when there are no unclaimed series", async () => {
    // No series at all
    await claimLocalSeries("user-456");
    // Should complete without error
  });

  it("bumps updatedAt on claimed docs", async () => {
    const before = new Date("2026-01-01T00:00:00.000Z");
    const series = await createSeries({
      title: "Test",
      description: "",
      tags: [],
    });
    expect(new Date(series.updatedAt) <= before).toBe(false);

    await claimLocalSeries("user-789");

    const db = await getDb();
    const updated = (await db.get(series._id)) as Series;
    expect(updated.updatedAt > series.updatedAt).toBe(true);
  });
});
