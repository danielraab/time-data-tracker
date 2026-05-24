import { describe, expect, it } from "vitest";
import { buildMapUrls } from "./location-map-modal";

describe("buildMapUrls", () => {
  const gps = { lat: 48.8566, lng: 2.3522 };

  it("embedSrc points to the OSM embed endpoint", () => {
    const { embedSrc } = buildMapUrls(gps);
    expect(embedSrc).toContain(
      "https://www.openstreetmap.org/export/embed.html",
    );
  });

  it("embedSrc contains the marker at the given coordinates", () => {
    const { embedSrc } = buildMapUrls(gps);
    expect(embedSrc).toContain(`marker=${gps.lat},${gps.lng}`);
  });

  it("embedSrc bbox is centred on the coordinates with ±0.005 offset", () => {
    const { embedSrc } = buildMapUrls(gps);
    const url = new URL(embedSrc);
    const bbox = url.searchParams.get("bbox")!.split(",").map(Number);
    expect(bbox[0]).toBeCloseTo(gps.lng - 0.005, 10);
    expect(bbox[1]).toBeCloseTo(gps.lat - 0.005, 10);
    expect(bbox[2]).toBeCloseTo(gps.lng + 0.005, 10);
    expect(bbox[3]).toBeCloseTo(gps.lat + 0.005, 10);
  });

  it("embedSrc uses the mapnik layer", () => {
    const { embedSrc } = buildMapUrls(gps);
    expect(embedSrc).toContain("layer=mapnik");
  });

  it("osmHref points to openstreetmap.org with mlat/mlon params", () => {
    const { osmHref } = buildMapUrls(gps);
    expect(osmHref).toContain("https://www.openstreetmap.org/");
    expect(osmHref).toContain(`mlat=${gps.lat}`);
    expect(osmHref).toContain(`mlon=${gps.lng}`);
  });

  it("osmHref hash encodes the zoom and coordinates", () => {
    const { osmHref } = buildMapUrls(gps, 12);
    expect(osmHref).toContain(`#map=12/${gps.lat}/${gps.lng}`);
  });

  it("default zoom is 15", () => {
    const { osmHref } = buildMapUrls(gps);
    expect(osmHref).toContain("#map=15/");
  });

  it("works for negative coordinates (southern / western hemisphere)", () => {
    const southern = { lat: -33.8688, lng: -70.6693 };
    const { embedSrc, osmHref } = buildMapUrls(southern);
    expect(embedSrc).toContain(`marker=${southern.lat},${southern.lng}`);
    expect(osmHref).toContain(`mlat=${southern.lat}`);
    expect(osmHref).toContain(`mlon=${southern.lng}`);
  });
});
