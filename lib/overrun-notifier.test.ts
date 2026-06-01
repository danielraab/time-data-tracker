import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkOverruns, clearOverrunFlag } from "./overrun-notifier";
import type { Entry, Series } from "./types";

// --- helpers ---

function makeSeries(overrides: Partial<Series> = {}): Series {
  return {
    _id: "series:s1",
    type: "series",
    title: "Test Series",
    description: "",
    tags: [],
    ownerId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    maxDurationMinutes: 60,
    ...overrides,
  };
}

function makeEntry(
  partial: Partial<Entry> & Pick<Entry, "_id" | "entryType">,
): Entry {
  return {
    type: "entry",
    seriesId: "series:s1",
    timestamp: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const START_ISO = "2026-01-01T10:00:00.000Z";
const startMs = new Date(START_ISO).getTime();
const overrunNowMs = startMs + 61 * 60_000; // 61 minutes later
const okNowMs = startMs + 30 * 60_000; // 30 minutes later

// --- mock setup ---

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    store,
  };
}

describe("checkOverruns", () => {
  let notificationMock: ReturnType<typeof vi.fn>;
  let ls: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    ls = mockLocalStorage();
    vi.stubGlobal("localStorage", ls);

    notificationMock = vi.fn();
    vi.stubGlobal(
      "Notification",
      Object.assign(notificationMock, {
        permission: "granted",
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when maxDurationMinutes is not set", () => {
    const series = makeSeries({ maxDurationMinutes: undefined });
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    checkOverruns(series, [start], overrunNowMs);
    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("does nothing when permission is not granted", () => {
    vi.stubGlobal(
      "Notification",
      Object.assign(vi.fn(), { permission: "denied" }),
    );
    const series = makeSeries();
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    checkOverruns(series, [start], overrunNowMs);
    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("does nothing when the open span is within the limit", () => {
    const series = makeSeries();
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    checkOverruns(series, [start], okNowMs);
    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("fires a notification when an open span exceeds the limit", () => {
    const series = makeSeries();
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    checkOverruns(series, [start], overrunNowMs);
    expect(notificationMock).toHaveBeenCalledOnce();
    expect(ls.setItem).toHaveBeenCalledWith("overrun:series:s1:e1", "1");
  });

  it("does not fire a second notification when the flag is already set", () => {
    ls.store["overrun:series:s1:e1"] = "1";
    const series = makeSeries();
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    checkOverruns(series, [start], overrunNowMs);
    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("does not fire for a closed span even if it would exceed the limit", () => {
    const series = makeSeries();
    const start = makeEntry({
      _id: "e1",
      entryType: "span_start",
      timestamp: START_ISO,
    });
    const end = makeEntry({
      _id: "e2",
      entryType: "span_end",
      startEntryId: "e1",
      timestamp: new Date(startMs + 90 * 60_000).toISOString(),
    });
    checkOverruns(series, [start, end], overrunNowMs);
    expect(notificationMock).not.toHaveBeenCalled();
  });
});

describe("clearOverrunFlag", () => {
  let ls: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    ls = mockLocalStorage();
    vi.stubGlobal("localStorage", ls);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes the deduplication key from localStorage", () => {
    ls.store["overrun:series:s1:e1"] = "1";
    clearOverrunFlag("series:s1", "e1");
    expect(ls.removeItem).toHaveBeenCalledWith("overrun:series:s1:e1");
  });
});
