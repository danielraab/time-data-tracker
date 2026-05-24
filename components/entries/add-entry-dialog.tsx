"use client";

import { useMemo, useState } from "react";
import { Dot, Hash, MapPin, Play, Square, Timer, Type } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEntry } from "@/lib/db/entries-repo";
import { openStartsBefore } from "@/lib/spans";
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { Entry, EntryType, Gps } from "@/lib/types";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  entries: Entry[];
  /** ISO timestamp to prefill. Must be supplied by the caller (e.g. the
   *  parent computes `new Date().toISOString()` in its click handler) so the
   *  form's state initializers stay pure. */
  defaultTimestamp: string;
  defaultType?: EntryType;
}

/**
 * Radix' Dialog unmounts its content while closed, so the inner form's state
 * is rebuilt every time the dialog opens — no manual reset needed.
 */
export function AddEntryDialog(props: AddEntryDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AddEntryForm
          seriesId={props.seriesId}
          entries={props.entries}
          defaultTimestamp={props.defaultTimestamp}
          defaultType={props.defaultType}
          onClose={() => props.onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface AddEntryFormProps {
  seriesId: string;
  entries: Entry[];
  defaultTimestamp: string;
  defaultType?: EntryType;
  onClose: () => void;
}

function AddEntryForm({
  seriesId,
  entries,
  defaultTimestamp,
  defaultType,
  onClose,
}: AddEntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(
    defaultType ?? "point_label",
  );
  const [timeLocal, setTimeLocal] = useState(() =>
    toDateTimeLocal(defaultTimestamp),
  );
  const [label, setLabel] = useState("");
  const [valueText, setValueText] = useState("");
  const [gps, setGps] = useState<Gps | undefined>();
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [linkedStartId, setLinkedStartId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Only starts that happen BEFORE this proposed end can be its match.
  const candidateStarts = useMemo(() => {
    try {
      const proposedEndIso = fromDateTimeLocal(timeLocal);
      return openStartsBefore(entries, proposedEndIso);
    } catch {
      return [];
    }
  }, [entries, timeLocal]);

  function setNow() {
    setTimeLocal(toDateTimeLocal(new Date().toISOString()));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSubmit() {
    if (saving) return;
    const numericValue =
      entryType === "point_number" ? Number(valueText) : undefined;
    if (entryType === "point_number" && !Number.isFinite(numericValue)) return;

    setSaving(true);
    try {
      await createEntry({
        seriesId,
        entryType,
        timestamp: fromDateTimeLocal(timeLocal),
        label,
        value: numericValue,
        gps,
        startEntryId:
          entryType === "span_end" && linkedStartId ? linkedStartId : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isPoint = entryType === "point_label" || entryType === "point_number";
  const showLinkField = entryType === "span_end";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.entries.addEntry}</DialogTitle>
        <DialogDescription>{t.entries.typeHints[entryType]}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Main type toggle: Point | Duration */}
        <div className="space-y-2">
          <Label>{t.entries.typeLabel}</Label>
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                isPoint
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => {
                if (!isPoint) setEntryType("point_label");
              }}
            >
              <Dot className="size-4" />
              {t.entries.modePoint}
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l ${
                !isPoint
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => {
                if (isPoint) setEntryType("span_start");
              }}
            >
              <Timer className="size-4" />
              {t.entries.modeDuration}
            </button>
          </div>
        </div>

        {/* Time field */}
        <div className="space-y-2">
          <Label htmlFor="entry-time">{t.entries.timeLabel}</Label>
          <div className="flex gap-2">
            <Input
              id="entry-time"
              type="datetime-local"
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={setNow}>
              {t.entries.now}
            </Button>
          </div>
        </div>

        {/* Point: Text/Number sub-toggle + input */}
        {isPoint && (
          <div className="flex gap-2 items-end">
            <div className="inline-flex rounded-md border overflow-hidden shrink-0 self-end">
              <button
                type="button"
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors ${
                  entryType === "point_label"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setEntryType("point_label")}
              >
                <Type className="size-3" />
                {t.entries.subText}
              </button>
              <button
                type="button"
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors border-l ${
                  entryType === "point_number"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setEntryType("point_number")}
              >
                <Hash className="size-3" />
                {t.entries.subNumber}
              </button>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="entry-point-input">
                {entryType === "point_label"
                  ? t.entries.labelLabel
                  : t.entries.valueLabel}
                {entryType === "point_label" && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ({t.common.optional})
                  </span>
                )}
              </Label>
              <Input
                id="entry-point-input"
                type={entryType === "point_number" ? "number" : "text"}
                inputMode={entryType === "point_number" ? "decimal" : undefined}
                value={entryType === "point_number" ? valueText : label}
                onChange={(e) =>
                  entryType === "point_number"
                    ? setValueText(e.target.value)
                    : setLabel(e.target.value)
                }
                required={entryType === "point_number"}
              />
            </div>
          </div>
        )}

        {/* Duration: Start/End sub-toggle + label input */}
        {!isPoint && (
          <div className="flex gap-2 items-end">
            <div className="inline-flex rounded-md border overflow-hidden shrink-0 self-end">
              <button
                type="button"
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors ${
                  entryType === "span_start"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setEntryType("span_start")}
              >
                <Play className="size-3" />
                {t.entries.subStart}
              </button>
              <button
                type="button"
                className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors border-l ${
                  entryType === "span_end"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setEntryType("span_end")}
              >
                <Square className="size-3" />
                {t.entries.subEnd}
              </button>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="entry-label">
                {t.entries.labelLabel}{" "}
                <span className="text-xs text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Input
                id="entry-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>
        )}

        {showLinkField && (
          <div className="space-y-2">
            <Label htmlFor="entry-link">{t.entries.linkedStartLabel}</Label>
            {candidateStarts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t.entries.noStartCandidates}
              </p>
            ) : (
              <Select
                value={linkedStartId || "__none__"}
                onValueChange={(v) =>
                  setLinkedStartId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="entry-link">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t.entries.noLink}</SelectItem>
                  {candidateStarts.map((start) => (
                    <SelectItem key={start._id} value={start._id}>
                      {start.label || t.entries.types.span_start} ·{" "}
                      {formatDateTime(start.timestamp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            disabled={gpsState === "loading"}
          >
            <MapPin className="size-4" />
            {t.entries.addLocation}
          </Button>
          {gps && (
            <span className="text-xs text-muted-foreground">
              {t.entries.locationAdded} · {gps.lat.toFixed(4)},{" "}
              {gps.lng.toFixed(4)}
            </span>
          )}
          {gpsState === "error" && (
            <span className="text-xs text-destructive">
              {t.entries.locationUnavailable}
            </span>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {t.common.add}
        </Button>
      </DialogFooter>
    </>
  );
}
