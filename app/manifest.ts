import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TiDaTra – Time & Data Tracker",
    short_name: "TiDaTra",
    description:
      "Offline-first tracker for time series, durations and data points.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    // Declare permission policy for Periodic Background Sync.
    // Chrome uses this to gate the API under certain conditions.
    permissions_policy: "periodic-background-sync=(self)",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
