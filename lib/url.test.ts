import { describe, expect, it } from "vitest";
import { seriesPath, seriesUrlId, urlIdToSeriesId } from "./url";
import type { Series } from "./types";

const SERIES_ID = "series:e7a8b9c0-1234-5678-9abc-def012345678";

function makeSeries(id: string): Series {
  return {
    _id: id,
    type: "series",
    title: "",
    description: "",
    tags: [],
    ownerId: null,
    createdAt: "",
    updatedAt: "",
  };
}

describe("series url helpers", () => {
  it("strips the `series:` prefix from a stored _id", () => {
    expect(seriesUrlId(SERIES_ID)).toBe(
      "e7a8b9c0-1234-5678-9abc-def012345678",
    );
  });

  it("accepts a Series object directly", () => {
    expect(seriesUrlId(makeSeries(SERIES_ID))).toBe(
      "e7a8b9c0-1234-5678-9abc-def012345678",
    );
  });

  it("rebuilds the _id from the URL slug", () => {
    expect(urlIdToSeriesId("e7a8b9c0-1234-5678-9abc-def012345678")).toBe(
      SERIES_ID,
    );
  });

  it("leaves an already-prefixed segment alone (defence)", () => {
    expect(urlIdToSeriesId(SERIES_ID)).toBe(SERIES_ID);
  });

  it("round-trips _id -> URL -> _id without mutation", () => {
    expect(urlIdToSeriesId(seriesUrlId(SERIES_ID))).toBe(SERIES_ID);
  });

  it("produces a colon-free detail path so the URL needs no encoding", () => {
    const path = seriesPath(SERIES_ID);
    expect(path).toBe("/series/e7a8b9c0-1234-5678-9abc-def012345678");
    expect(path).not.toContain(":");
    expect(path).not.toContain("%");
  });
});
