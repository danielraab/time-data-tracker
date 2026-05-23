import { describe, expect, it } from "vitest";
import {
  hasOpenSpan,
  isOpenSpanEntry,
  openStarts,
  orphanEnds,
  pairSpans,
} from "./spans";
import type { Entry } from "./types";

function entry(partial: Partial<Entry> & Pick<Entry, "_id" | "entryType">): Entry {
  return {
    type: "entry",
    seriesId: "s1",
    timestamp: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("span helpers", () => {
  it("flags a lone span_start as open", () => {
    const start = entry({ _id: "1", entryType: "span_start" });
    expect(hasOpenSpan([start])).toBe(true);
    expect(openStarts([start])).toEqual([start]);
    expect(isOpenSpanEntry(start, [start])).toBe(true);
  });

  it("closes a span when a span_end references its _id", () => {
    const start = entry({ _id: "1", entryType: "span_start" });
    const end = entry({
      _id: "2",
      entryType: "span_end",
      startEntryId: "1",
    });
    expect(hasOpenSpan([start, end])).toBe(false);
    expect(openStarts([start, end])).toEqual([]);
    const pairs = pairSpans([start, end]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].end?._id).toBe("2");
  });

  it("treats a span_end with no matching start as an orphan", () => {
    const end = entry({
      _id: "x",
      entryType: "span_end",
      startEntryId: "missing",
    });
    expect(orphanEnds([end])).toEqual([end]);
    expect(hasOpenSpan([end])).toBe(true);
  });

  it("never considers point entries open", () => {
    const points = [
      entry({ _id: "a", entryType: "point_label", label: "x" }),
      entry({ _id: "b", entryType: "point_number", value: 1 }),
    ];
    expect(hasOpenSpan(points)).toBe(false);
    expect(openStarts(points)).toEqual([]);
    expect(orphanEnds(points)).toEqual([]);
  });

  it("pairs multiple spans independently", () => {
    const entries = [
      entry({ _id: "s1", entryType: "span_start" }),
      entry({ _id: "e1", entryType: "span_end", startEntryId: "s1" }),
      entry({ _id: "s2", entryType: "span_start" }),
    ];
    const pairs = pairSpans(entries);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].end?._id).toBe("e1");
    expect(pairs[1].end).toBeNull();
  });
});
