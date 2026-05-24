"use client";

import { Map } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n/en";

export interface MapPoint {
  lat: number;
  lng: number;
  /** Text shown in the marker popup. */
  popup: string;
}

interface SeriesMapModalProps {
  title: string;
  points: MapPoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pure helper — exported for unit tests. */
export function buildSrcdoc(points: MapPoint[]): string {
  // Safely serialize numbers only — no string injection risk.
  const safePoints = points.map(({ lat, lng, popup }) => ({
    lat,
    lng,
    // escape < > & to prevent script-tag breakout from popup strings
    popup: popup
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;"),
  }));
  const json = JSON.stringify(safePoints);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;font-family:sans-serif}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${json};
    var map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    var markers = points.map(function(p) {
      var m = L.marker([p.lat, p.lng]).addTo(map);
      if (p.popup) m.bindPopup(p.popup);
      return m;
    });
    if (markers.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
    }
  </script>
</body>
</html>`;
}

export function SeriesMapModal({
  title,
  points,
  open,
  onOpenChange,
}: SeriesMapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Map className="size-4 shrink-0" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full" style={{ height: 420 }}>
          {open && (
            <iframe
              title={t.series.mapModalTitle}
              srcDoc={buildSrcdoc(points)}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts"
              loading="lazy"
            />
          )}
        </div>
        <p className="px-4 py-2 text-xs text-muted-foreground">
          {t.series.mapPointCount(points.length)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
