import { describe, expect, it } from "vitest";
import {
  formatDurationBetween,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "./format";

describe("format helpers", () => {
  it("formats a known duration", () => {
    expect(
      formatDurationBetween(
        "2026-01-01T10:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
      ),
    ).toBe("2 hours");
  });

  it("round-trips toDateTimeLocal -> fromDateTimeLocal", () => {
    const iso = "2026-05-22T14:30:00.000Z";
    const local = toDateTimeLocal(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const back = fromDateTimeLocal(local);
    // Within a minute (datetime-local has minute precision).
    expect(Math.abs(new Date(back).getTime() - new Date(iso).getTime())).toBeLessThan(60_000);
  });
});
