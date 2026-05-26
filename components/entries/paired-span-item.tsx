"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Link2Off,
  MapPin,
  Pencil,
  Timer,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { LocationMapModal } from "./location-map-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteEntry, updateEntry } from "@/lib/db/entries-repo";
import {
  formatDateTime,
  formatDurationBetween,
  formatDurationDetailed,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";

interface PairedSpanItemProps {
  start: Entry;
  end: Entry;
}

export function PairedSpanItem({ start, end }: PairedSpanItemProps) {
  const [editing, setEditing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [startLocal, setStartLocal] = useState(
    toDateTimeLocal(start.timestamp),
  );
  const [endLocal, setEndLocal] = useState(toDateTimeLocal(end.timestamp));
  const [label, setLabel] = useState(start.label ?? "");
  const [busy, setBusy] = useState(false);

  function resetEdit() {
    setStartLocal(toDateTimeLocal(start.timestamp));
    setEndLocal(toDateTimeLocal(end.timestamp));
    setLabel(start.label ?? "");
  }

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      const trimmedLabel = label.trim() || undefined;
      await updateEntry(start._id, {
        timestamp: fromDateTimeLocal(startLocal),
        label: trimmedLabel,
      });
      await updateEntry(end._id, {
        timestamp: fromDateTimeLocal(endLocal),
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    resetEdit();
    setEditing(false);
  }

  async function handleUnlink() {
    if (busy) return;
    setBusy(true);
    try {
      await updateEntry(end._id, { startEntryId: undefined });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t.common.confirmDelete)) return;
    await Promise.all([deleteEntry(start._id), deleteEntry(end._id)]);
  }

  const gps = start.gps ?? end.gps;
  const isReversed = end.timestamp < start.timestamp;

  return (
    <li
      className={`rounded-lg border p-3 ${
        isReversed
          ? "border-destructive bg-card"
          : "border-primary/30 bg-primary/5 dark:bg-primary/[0.07]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-primary/60">
          <Timer className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              {formatDateTime(start.timestamp)}
              <ArrowRight className="size-3" />
              {formatDateTime(end.timestamp)}
            </span>
            <Badge variant="outline" className="font-normal">
              {formatDurationBetween(start.timestamp, end.timestamp)}
            </Badge>
            {isReversed && (
              <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                <TriangleAlert className="size-3" />
                {t.entries.reversedSpan}
              </span>
            )}
            {gps && (
              <>
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <MapPin className="size-3" />
                  {gps.lat.toFixed(3)}, {gps.lng.toFixed(3)}
                </button>
                <LocationMapModal
                  gps={gps}
                  open={mapOpen}
                  onOpenChange={setMapOpen}
                />
              </>
            )}
          </div>

          {editing ? (
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label
                    htmlFor={`start-${start._id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t.entries.types.span_start}
                  </Label>
                  <Input
                    id={`start-${start._id}`}
                    type="datetime-local"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`end-${end._id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t.entries.types.span_end}
                  </Label>
                  <Input
                    id={`end-${end._id}`}
                    type="datetime-local"
                    value={endLocal}
                    onChange={(e) => setEndLocal(e.target.value)}
                  />
                </div>
              </div>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.entries.labelLabel}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSave} disabled={busy}>
                  <Check className="size-4" />
                  {t.common.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="size-4" />
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnlink}
                  disabled={busy}
                >
                  <Link2Off className="size-4" />
                  {t.entries.unlink}
                </Button>
              </div>
            </div>
          ) : start.label ? (
            <p className="text-sm font-medium">
              {start.label}
              <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                {formatDurationDetailed(start.timestamp, end.timestamp)}
              </span>
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t.entries.pairedRange}
              <span className="ml-2 not-italic text-xs tabular-nums">
                {formatDurationDetailed(start.timestamp, end.timestamp)}
              </span>
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={t.common.edit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              aria-label={t.common.delete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
