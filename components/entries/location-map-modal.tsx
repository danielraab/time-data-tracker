"use client";

import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n/en";
import type { Gps } from "@/lib/types";

/** Pure helper — exported so it can be unit-tested without a DOM. */
export function buildMapUrls(
  gps: Pick<Gps, "lat" | "lng">,
  zoom = 15,
): { embedSrc: string; osmHref: string } {
  const { lat, lng } = gps;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
  const osmHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
  return { embedSrc, osmHref };
}

interface LocationMapModalProps {
  gps: Gps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationMapModal({
  gps,
  open,
  onOpenChange,
}: LocationMapModalProps) {
  const { lat, lng } = gps;
  const { embedSrc, osmHref } = buildMapUrls(gps);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 shrink-0" />
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full" style={{ height: 320 }}>
          <iframe
            title={t.entries.locationMap}
            src={embedSrc}
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          <a
            href={osmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t.entries.openInOsm}
          </a>
          {gps.accuracy != null && (
            <span className="ml-3">
              {t.entries.accuracy(Math.round(gps.accuracy))}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
