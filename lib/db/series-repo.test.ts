import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, destroyTestDb } from "../../test/db-fixture";
import { createEntry, listEntries } from "./entries-repo";
import {
  createSeries,
  deleteSeries,
  getDefaultSeries,
  getSeries,
  listSeries,
  setDefaultSeries,
  updateSeries,
} from "./series-repo";

describe("series repo", () => {
  beforeEach(async () => {
    await createTestDb();
  });
  afterEach(async () => {
    await destroyTestDb();
  });

  // Regression for the "could not be found" bug: a series the app just created
  // must be retrievable by the exact _id that createSeries returns. If this
  // ever breaks, every detail page breaks with it.
  it("a freshly created series can be fetched by its _id", async () => {
    const created = await createSeries({
      title: "Test",
      description: "",
      tags: [],
    });
    expect(created._id).toMatch(/^series:[0-9a-f-]{36}$/i);
    const fetched = await getSeries(created._id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Test");
    expect(fetched?._id).toBe(created._id);
  });

  it("returns null for an unknown id rather than throwing", async () => {
    expect(await getSeries("series:does-not-exist")).toBeNull();
  });

  it("lists series newest-first by updatedAt", async () => {
    await createSeries({ title: "A", description: "", tags: [] });
    await new Promise((r) => setTimeout(r, 5));
    await createSeries({ title: "B", description: "", tags: [] });
    const list = await listSeries();
    expect(list.map((s) => s.title)).toEqual(["B", "A"]);
  });

  it("normalises tags on create (trim, dedup, sort)", async () => {
    const created = await createSeries({
      title: "T",
      description: "",
      tags: [" run ", "run", "Bike", "bike"],
    });
    // localeCompare orders lowercase before uppercase by default.
    expect(created.tags).toEqual(["bike", "Bike", "run"]);
  });

  it("updates a series and bumps updatedAt", async () => {
    const created = await createSeries({
      title: "T",
      description: "",
      tags: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateSeries(created._id, { title: "T2" });
    expect(updated.title).toBe("T2");
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("deletes a series and cascades to its entries", async () => {
    const series = await createSeries({
      title: "T",
      description: "",
      tags: [],
    });
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: new Date().toISOString(),
      label: "hi",
    });
    expect(await listEntries(series._id)).toHaveLength(1);

    await deleteSeries(series._id);

    expect(await getSeries(series._id)).toBeNull();
    expect(await listEntries(series._id)).toHaveLength(0);
  });

  // --- default series ---

  it("first created series is automatically the default", async () => {
    const s = await createSeries({ title: "First", description: "", tags: [] });
    expect(s.isDefault).toBe(true);
    const def = await getDefaultSeries();
    expect(def?._id).toBe(s._id);
  });

  it("subsequent series are not the default by default", async () => {
    await createSeries({ title: "A", description: "", tags: [] });
    const b = await createSeries({ title: "B", description: "", tags: [] });
    expect(b.isDefault).toBeFalsy();
  });

  it("setDefaultSeries switches the default and clears the old one", async () => {
    const a = await createSeries({ title: "A", description: "", tags: [] });
    const b = await createSeries({ title: "B", description: "", tags: [] });
    expect(a.isDefault).toBe(true);

    await setDefaultSeries(b._id);

    const defNow = await getDefaultSeries();
    expect(defNow?._id).toBe(b._id);
    const aFetched = await getSeries(a._id);
    expect(aFetched?.isDefault).toBeFalsy();
  });

  it("deleting the default series promotes the next newest to default", async () => {
    const a = await createSeries({ title: "A", description: "", tags: [] });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createSeries({ title: "B", description: "", tags: [] });
    expect(a.isDefault).toBe(true);

    await deleteSeries(a._id);

    const def = await getDefaultSeries();
    expect(def?._id).toBe(b._id);
  });

  it("deleting the only series leaves no default", async () => {
    const s = await createSeries({ title: "Only", description: "", tags: [] });
    await deleteSeries(s._id);
    expect(await getDefaultSeries()).toBeNull();
  });
});
