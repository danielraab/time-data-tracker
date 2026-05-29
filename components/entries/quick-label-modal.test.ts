import { describe, expect, it } from "vitest";
import { buildQuickLabelToast } from "./quick-label-modal";

describe("buildQuickLabelToast", () => {
  describe("point_label entries", () => {
    it("includes the label when non-empty", () => {
      expect(buildQuickLabelToast("point_label", "coffee")).toBe(
        'Point added: "coffee"',
      );
    });

    it("returns a generic message when label is empty", () => {
      expect(buildQuickLabelToast("point_label", "")).toBe("Point added");
    });
  });

  describe("span_start entries", () => {
    it("includes the label when non-empty", () => {
      expect(buildQuickLabelToast("span_start", "gym session")).toBe(
        'Duration started: "gym session"',
      );
    });

    it("returns a generic message when label is empty", () => {
      expect(buildQuickLabelToast("span_start", "")).toBe("Duration started");
    });
  });
});
