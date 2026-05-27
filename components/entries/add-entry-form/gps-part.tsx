"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/en";
import type { Gps } from "@/lib/types";

export interface GpsPartProps {
  onCapture: (gps: Gps) => void;
}

export function GpsPart({ onCapture }: GpsPartProps) {
  const [gps, setGps] = useState<Gps | undefined>();
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  function capture() {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const captured: Gps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setGps(captured);
        onCapture(captured);
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={capture}
        disabled={gpsState === "loading"}
      >
        <MapPin className="size-4" />
        {t.entries.addLocation}
      </Button>
      {gps && (
        <span className="text-xs text-muted-foreground">
          {t.entries.locationAdded} · {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
        </span>
      )}
      {gpsState === "error" && (
        <span className="text-xs text-destructive">
          {t.entries.locationUnavailable}
        </span>
      )}
    </div>
  );
}
