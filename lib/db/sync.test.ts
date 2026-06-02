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
// applyPulledDocs — conflict retry (uses a fake db to force a conflict result)
// ---------------------------------------------------------------------------

describe("applyPulledDocs conflict retry", () => {
  function makeDoc(id: string, updatedAt: string): TidatraDoc {
    return {
      _id: id,
      type: "series",
      title: "x",
      description: "",
      tags: [],
      ownerId: null,
      createdAt: updatedAt,
      updatedAt,
    } as TidatraDoc;
  }

  it("re-fetches the rev and retries when bulkDocs reports a conflict", async () => {
    const id = "series:conflict-1";
    const incoming = makeDoc(id, "2026-02-01T00:00:00.000Z");
    // Local copy is older, so LWW says the incoming doc should win on retry.
    const localOlder = { ...makeDoc(id, "2026-01-01T00:00:00.000Z"), _rev: "9-current" };

    let bulkCalls = 0;
    const writes: TidatraDoc[][] = [];
    const fakeDb = {
      async get() {
        return localOlder;
      },
      async bulkDocs(docs: TidatraDoc[]) {
        bulkCalls++;
        writes.push(docs);
        if (bulkCalls === 1) {
          // First write loses a race → conflict.
          return [{ id, error: true, name: "conflict", status: 409 }];
        }
        return [{ ok: true, id, rev: "10-new" }];
      },
    } as unknown as PouchDB.Database<TidatraDoc>;

    const written = await applyPulledDocs(fakeDb, [incoming]);

    expect(bulkCalls).toBe(2);
    expect(written).toBe(1);
    // Retry must carry the freshly-fetched rev so it can succeed.
    expect(writes[1][0]._rev).toBe("9-current");
  });

  it("does not count a doc still conflicting after the retry", async () => {
    const id = "series:conflict-2";
    const incoming = makeDoc(id, "2026-02-01T00:00:00.000Z");

    const fakeDb = {
      async get() {
        return { ...makeDoc(id, "2026-01-01T00:00:00.000Z"), _rev: "1-a" };
      },
      async bulkDocs() {
        return [{ id, error: true, name: "conflict", status: 409 }];
      },
    } as unknown as PouchDB.Database<TidatraDoc>;

    const written = await applyPulledDocs(fakeDb, [incoming]);
    expect(written).toBe(0);
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
