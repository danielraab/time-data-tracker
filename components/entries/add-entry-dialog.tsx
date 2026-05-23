"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
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
import { openStarts } from "@/lib/spans";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
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

const TYPES: EntryType[] = [
  "point_label",
  "point_number",
  "span_start",
  "span_end",
];

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

  const openStartEntries = openStarts(entries);

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
          entryType === "span_end" && linkedStartId
            ? linkedStartId
            : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const showLabelField = entryType !== "point_number";
  const showValueField = entryType === "point_number";
  const showLinkField =
    entryType === "span_end" && openStartEntries.length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.entries.addEntry}</DialogTitle>
        <DialogDescription>{t.entries.typeHints[entryType]}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entry-type">{t.entries.typeLabel}</Label>
          <Select
            value={entryType}
            onValueChange={(v) => setEntryType(v as EntryType)}
          >
            <SelectTrigger id="entry-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t.entries.types[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        {showLabelField && (
          <div className="space-y-2">
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
        )}

        {showValueField && (
          <div className="space-y-2">
            <Label htmlFor="entry-value">{t.entries.valueLabel}</Label>
            <Input
              id="entry-value"
              type="number"
              inputMode="decimal"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              required
            />
          </div>
        )}

        {showLinkField && (
          <div className="space-y-2">
            <Label htmlFor="entry-link">{t.entries.closeSpan}</Label>
            <Select value={linkedStartId} onValueChange={setLinkedStartId}>
              <SelectTrigger id="entry-link">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {openStartEntries.map((start) => (
                  <SelectItem key={start._id} value={start._id}>
                    {start.label || t.entries.types.span_start} ·{" "}
                    {new Date(start.timestamp).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
