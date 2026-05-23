import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, destroyTestDb } from "../../test/db-fixture";
import {
  createEntry,
  deleteEntry,
  listAllEntries,
  listEntries,
  updateEntry,
} from "./entries-repo";
import type { EntryInput } from "@/lib/types";

const makeInput = (overrides: Partial<EntryInput> = {}): EntryInput => ({
  seriesId: "series:a",
  entryType: "point_label",
  timestamp: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("entries repo", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  it("creates an entry with a prefixed id and lists it by series", async () => {
    const created = await createEntry(makeInput({ label: "hi" }));
    expect(created._id).toMatch(/^entry:[0-9a-f-]{36}$/i);
    const list = await listEntries("series:a");
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("hi");
  });

  it("filters listEntries to a single series", async () => {
    await createEntry(makeInput());
    await createEntry(makeInput({ seriesId: "series:b" }));
    expect(await listEntries("series:a")).toHaveLength(1);
    expect(await listEntries("series:b")).toHaveLength(1);
    expect(await listAllEntries()).toHaveLength(2);
  });

  it("sorts entries by timestamp ascending", async () => {
    await createEntry(
      makeInput({ timestamp: "2026-01-02T00:00:00.000Z", label: "second" }),
    );
    await createEntry(
      makeInput({ timestamp: "2026-01-01T00:00:00.000Z", label: "first" }),
    );
    const list = await listEntries("series:a");
    expect(list.map((e) => e.label)).toEqual(["first", "second"]);
  });

  it("links a span_end to its span_start via startEntryId", async () => {
    const start = await createEntry(
      makeInput({ entryType: "span_start", label: "run" }),
    );
    const end = await createEntry(
      makeInput({
        entryType: "span_end",
        timestamp: "2026-01-01T01:00:00.000Z",
        startEntryId: start._id,
      }),
    );
    expect(end.startEntryId).toBe(start._id);
  });

  it("updates timestamp and label", async () => {
    const created = await createEntry(makeInput({ label: "old" }));
    const updated = await updateEntry(created._id, {
      label: "new",
      timestamp: "2026-02-01T00:00:00.000Z",
    });
    expect(updated.label).toBe("new");
    expect(updated.timestamp).toBe("2026-02-01T00:00:00.000Z");
  });

  it("deletes an entry", async () => {
    const created = await createEntry(makeInput());
    await deleteEntry(created._id);
    expect(await listEntries("series:a")).toHaveLength(0);
  });

  it("omits empty/whitespace-only labels", async () => {
    const created = await createEntry(makeInput({ label: "   " }));
    expect(created.label).toBeUndefined();
  });
});
