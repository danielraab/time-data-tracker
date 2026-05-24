import { describe, expect, it } from "vitest";
import { buildSrcdoc } from "./series-map-modal";
import type { MapPoint } from "./series-map-modal";

const paris: MapPoint = { lat: 48.8566, lng: 2.3522, popup: "Paris" };
const berlin: MapPoint = { lat: 52.52, lng: 13.405, popup: "Berlin" };

describe("buildSrcdoc", () => {
  it("returns a string starting with <!DOCTYPE html>", () => {
    expect(buildSrcdoc([paris])).toMatch(/^<!DOCTYPE html>/);
  });

  it("includes the Leaflet CSS CDN link", () => {
    expect(buildSrcdoc([paris])).toContain(
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    );
  });

  it("includes the Leaflet JS CDN script", () => {
    expect(buildSrcdoc([paris])).toContain(
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    );
  });

  it("embeds point coordinates in the inline JSON", () => {
    const html = buildSrcdoc([paris]);
    expect(html).toContain(`"lat":${paris.lat}`);
    expect(html).toContain(`"lng":${paris.lng}`);
  });

  it("embeds the popup text", () => {
    expect(buildSrcdoc([paris])).toContain('"popup":"Paris"');
  });

  it("embeds all points for multiple markers", () => {
    const html = buildSrcdoc([paris, berlin]);
    expect(html).toContain(`"lat":${paris.lat}`);
    expect(html).toContain(`"lat":${berlin.lat}`);
  });

  it("uses OSM tile layer URL", () => {
    expect(buildSrcdoc([paris])).toContain(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
  });

  describe("popup HTML escaping", () => {
    it("escapes & in popup text", () => {
      const pt: MapPoint = { lat: 0, lng: 0, popup: "A & B" };
      expect(buildSrcdoc([pt])).toContain("A &amp; B");
      expect(buildSrcdoc([pt])).not.toContain('"A & B"');
    });

    it("escapes < in popup text", () => {
      const pt: MapPoint = { lat: 0, lng: 0, popup: "<script>" };
      const html = buildSrcdoc([pt]);
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain('"<script>"');
    });

    it("escapes > in popup text", () => {
      const pt: MapPoint = { lat: 0, lng: 0, popup: "a > b" };
      const html = buildSrcdoc([pt]);
      expect(html).toContain("a &gt; b");
    });
  });

  it("handles negative coordinates (southern/western hemisphere)", () => {
    const pt: MapPoint = { lat: -33.8688, lng: -70.6693, popup: "Santiago" };
    const html = buildSrcdoc([pt]);
    expect(html).toContain(`"lat":${pt.lat}`);
    expect(html).toContain(`"lng":${pt.lng}`);
  });

  it("handles an empty popup string", () => {
    const pt: MapPoint = { lat: 0, lng: 0, popup: "" };
    expect(() => buildSrcdoc([pt])).not.toThrow();
    expect(buildSrcdoc([pt])).toContain('"popup":""');
  });
});
