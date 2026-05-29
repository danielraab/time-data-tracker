import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { consumeLongPress } from "./use-long-press";

describe("consumeLongPress", () => {
  it("returns false when isLongPress is false", () => {
    const ref = createRef<boolean>() as React.MutableRefObject<boolean>;
    ref.current = false;
    expect(consumeLongPress(ref)).toBe(false);
  });

  it("returns true when isLongPress is true", () => {
    const ref = createRef<boolean>() as React.MutableRefObject<boolean>;
    ref.current = true;
    expect(consumeLongPress(ref)).toBe(true);
  });

  it("resets the ref to false after consuming a long-press", () => {
    const ref = createRef<boolean>() as React.MutableRefObject<boolean>;
    ref.current = true;
    consumeLongPress(ref);
    expect(ref.current).toBe(false);
  });

  it("does not change the ref when it was already false", () => {
    const ref = createRef<boolean>() as React.MutableRefObject<boolean>;
    ref.current = false;
    consumeLongPress(ref);
    expect(ref.current).toBe(false);
  });

  it("allows the next click to pass through after a long-press is consumed", () => {
    const ref = createRef<boolean>() as React.MutableRefObject<boolean>;
    ref.current = true;
    // First call: consumes the long-press
    expect(consumeLongPress(ref)).toBe(true);
    // Second call: ref was reset, so the click is NOT suppressed
    expect(consumeLongPress(ref)).toBe(false);
  });
});
