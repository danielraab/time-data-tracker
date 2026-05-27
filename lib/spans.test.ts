import { describe, expect, it } from "vitest";
import {
  hasOpenSpan,
  isOpenSpanEntry,
  openStarts,
  openStartsBefore,
  orphanEnds,
  orphanEndsAfter,
  pairSpans,
  sumDurationsForDay,
} from "./spans";
import type { Entry } from "./types";

function entry(
  partial: Partial<Entry> & Pick<Entry, "_id" | "entryType">,
): Entry {
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

  it("only returns open starts strictly before the given time", () => {
    const entries = [
      entry({
        _id: "early",
        entryType: "span_start",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      entry({
        _id: "same",
        entryType: "span_start",
        timestamp: "2026-01-01T12:00:00.000Z",
      }),
      entry({
        _id: "late",
        entryType: "span_start",
        timestamp: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const ids = openStartsBefore(entries, "2026-01-01T12:00:00.000Z").map(
      (e) => e._id,
    );
    expect(ids).toEqual(["early"]);
  });

  it("only returns orphan ends strictly after the given time", () => {
    const entries = [
      entry({
        _id: "before",
        entryType: "span_end",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      entry({
        _id: "same",
        entryType: "span_end",
        timestamp: "2026-01-01T12:00:00.000Z",
      }),
      entry({
        _id: "after",
        entryType: "span_end",
        timestamp: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const ids = orphanEndsAfter(entries, "2026-01-01T12:00:00.000Z").map(
      (e) => e._id,
    );
    expect(ids).toEqual(["after"]);
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

describe("sumDurationsForDay", () => {
  // Day window: 2026-01-02 00:00 – 2026-01-03 00:00 UTC
  const DAY_START = new Date("2026-01-02T00:00:00.000Z").getTime();
  const DAY_END = new Date("2026-01-03T00:00:00.000Z").getTime();
  const NOW = new Date("2026-01-02T12:00:00.000Z").getTime();

  it("returns 0 when there are no span entries", () => {
    const pts = [entry({ _id: "p", entryType: "point_label" })];
    expect(sumDurationsForDay(pts, DAY_START, DAY_END, NOW)).toBe(0);
  });

  it("counts a fully-contained completed span", () => {
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-02T08:00:00.000Z",
    });
    const end = entry({
      _id: "e",
      entryType: "span_end",
      startEntryId: "s",
      timestamp: "2026-01-02T10:00:00.000Z",
    });
    const ms = sumDurationsForDay([start, end], DAY_START, DAY_END, NOW);
    expect(ms).toBe(2 * 60 * 60 * 1000); // 2 hours
  });

  it("clips a span that starts before the day", () => {
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-01T22:00:00.000Z",
    });
    const end = entry({
      _id: "e",
      entryType: "span_end",
      startEntryId: "s",
      timestamp: "2026-01-02T02:00:00.000Z",
    });
    const ms = sumDurationsForDay([start, end], DAY_START, DAY_END, NOW);
    expect(ms).toBe(2 * 60 * 60 * 1000); // only 2 h inside the day
  });

  it("clips a span that ends after the day", () => {
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-02T22:00:00.000Z",
    });
    const end = entry({
      _id: "e",
      entryType: "span_end",
      startEntryId: "s",
      timestamp: "2026-01-03T04:00:00.000Z",
    });
    const ms = sumDurationsForDay([start, end], DAY_START, DAY_END, NOW);
    expect(ms).toBe(2 * 60 * 60 * 1000); // only 2 h inside the day
  });

  it("adds open span duration up to now when start is before now", () => {
    // start at 10:00, now at 12:00 => 2 h of open span
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-02T10:00:00.000Z",
    });
    const ms = sumDurationsForDay([start], DAY_START, DAY_END, NOW);
    expect(ms).toBe(2 * 60 * 60 * 1000);
  });

  it("ignores open span when start is at or after now", () => {
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-02T12:00:00.000Z",
    });
    const ms = sumDurationsForDay([start], DAY_START, DAY_END, NOW);
    expect(ms).toBe(0);
  });

  it("ignores spans entirely outside the day", () => {
    const start = entry({
      _id: "s",
      entryType: "span_start",
      timestamp: "2026-01-04T08:00:00.000Z",
    });
    const end = entry({
      _id: "e",
      entryType: "span_end",
      startEntryId: "s",
      timestamp: "2026-01-04T10:00:00.000Z",
    });
    const ms = sumDurationsForDay([start, end], DAY_START, DAY_END, NOW);
    expect(ms).toBe(0);
  });

  it("sums multiple spans correctly", () => {
    // 1 h + 30 min = 90 min
    const s1 = entry({
      _id: "s1",
      entryType: "span_start",
      timestamp: "2026-01-02T08:00:00.000Z",
    });
    const e1 = entry({
      _id: "e1",
      entryType: "span_end",
      startEntryId: "s1",
      timestamp: "2026-01-02T09:00:00.000Z",
    });
    const s2 = entry({
      _id: "s2",
      entryType: "span_start",
      timestamp: "2026-01-02T11:00:00.000Z",
    });
    const e2 = entry({
      _id: "e2",
      entryType: "span_end",
      startEntryId: "s2",
      timestamp: "2026-01-02T11:30:00.000Z",
    });
    const ms = sumDurationsForDay([s1, e1, s2, e2], DAY_START, DAY_END, NOW);
    expect(ms).toBe(90 * 60 * 1000);
  });
});
