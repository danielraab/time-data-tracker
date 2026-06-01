import { describe, expect, it } from "vitest";
import { buildPickerItems } from "./quick-add";
import type { Series } from "@/lib/types";

function makeSeries(id: string, title: string, isDefault?: boolean): Series {
  return {
    _id: id,
    type: "series",
    title,
    description: "",
    tags: [],
    ownerId: null,
    isDefault,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildPickerItems", () => {
  it("marks the current default series", () => {
    const a = makeSeries("a", "Alpha", true);
    const b = makeSeries("b", "Beta");
    const items = buildPickerItems([a, b], "a");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ series: a, isDefault: true });
    expect(items[1]).toEqual({ series: b, isDefault: false });
  });

  it("returns no item as default when currentDefaultId is undefined", () => {
    const a = makeSeries("a", "Alpha");
    const b = makeSeries("b", "Beta");
    const items = buildPickerItems([a, b], undefined);
    expect(items.every((i) => !i.isDefault)).toBe(true);
  });

  it("returns an empty array when the series list is empty", () => {
    expect(buildPickerItems([], "a")).toEqual([]);
  });

  it("handles a single series that is the default", () => {
    const a = makeSeries("a", "Only", true);
    const items = buildPickerItems([a], "a");
    expect(items).toEqual([{ series: a, isDefault: true }]);
  });
});
