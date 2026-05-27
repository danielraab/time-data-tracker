"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEntry } from "@/lib/db/entries-repo";
import { useEntries, useSeriesList } from "@/lib/db/hooks";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { Entry, EntryType, Gps, Series } from "@/lib/types";
import { TypeSwitch } from "./add-entry-form/type-switch";
import { PointPart } from "./add-entry-form/point-part";
import { DurationSinglePart } from "./add-entry-form/duration-single-part";
import { DurationFullPart } from "./add-entry-form/duration-full-part";
import { GpsPart } from "./add-entry-form/gps-part";

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
  /** When provided alongside `defaultType: "span_start"`, the dialog opens in
   *  "full duration" mode, pre-filling both start and end times and saving a
   *  linked span_start + span_end pair on submit. */
  defaultEndTimestamp?: string;
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
          defaultEndTimestamp={props.defaultEndTimestamp}
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
  /** Optional slot rendered between the dialog header and the type toggle.
   *  Used by the dashboard variant to inject a series selector. */
  seriesSelectorSlot?: ReactNode;
  /** See `AddEntryDialogProps.defaultEndTimestamp`. */
  defaultEndTimestamp?: string;
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

function AddEntryForm({
  seriesId,
  entries,
  defaultTimestamp,
  defaultType,
  onClose,
  seriesSelectorSlot,
  defaultEndTimestamp,
}: AddEntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(
    defaultType ?? (defaultEndTimestamp ? "span_start" : "point_label"),
  );
  const [timeLocal, setTimeLocal] = useState(() =>
    toDateTimeLocal(defaultTimestamp),
  );
  const [endTimeLocal, setEndTimeLocal] = useState(() =>
    defaultEndTimestamp ? toDateTimeLocal(defaultEndTimestamp) : "",
  );
  const [label, setLabel] = useState("");
  const [valueText, setValueText] = useState("");
  const [gps, setGps] = useState<Gps | undefined>();
  const [linkedStartId, setLinkedStartId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const isPoint = entryType === "point_label" || entryType === "point_number";
  /** Full duration mode: a linked start+end pair is created in one shot. */
  const isFullDuration = !isPoint && Boolean(endTimeLocal);

  async function handleSubmit() {
    if (saving || !seriesId) return;

    if (isFullDuration) {
      setSaving(true);
      try {
        const startEntry = await createEntry({
          seriesId,
          entryType: "span_start",
          timestamp: fromDateTimeLocal(timeLocal),
          label: label || undefined,
          gps,
        });
        await createEntry({
          seriesId,
          entryType: "span_end",
          timestamp: fromDateTimeLocal(endTimeLocal),
          label: label || undefined,
          startEntryId: startEntry._id,
        });
        onClose();
      } finally {
        setSaving(false);
      }
      return;
    }

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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.entries.addEntry}</DialogTitle>
        <DialogDescription>{t.entries.typeHints[entryType]}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {seriesSelectorSlot}

        {!isFullDuration && (
          <TypeSwitch
            isPoint={isPoint}
            onToggle={(p) => setEntryType(p ? "point_label" : "span_start")}
          />
        )}

        {isPoint ? (
          <PointPart
            timeLocal={timeLocal}
            onTimeChange={setTimeLocal}
            entryType={entryType as "point_label" | "point_number"}
            onTypeChange={setEntryType}
            label={label}
            onLabelChange={setLabel}
            valueText={valueText}
            onValueChange={setValueText}
          />
        ) : isFullDuration ? (
          <DurationFullPart
            timeLocal={timeLocal}
            onTimeChange={setTimeLocal}
            endTimeLocal={endTimeLocal}
            onEndTimeChange={setEndTimeLocal}
            label={label}
            onLabelChange={setLabel}
          />
        ) : (
          <DurationSinglePart
            timeLocal={timeLocal}
            onTimeChange={setTimeLocal}
            entryType={entryType as "span_start" | "span_end"}
            onTypeChange={setEntryType}
            label={label}
            onLabelChange={setLabel}
            entries={entries}
            linkedStartId={linkedStartId}
            onLinkedStartChange={setLinkedStartId}
          />
        )}

        <GpsPart onCapture={setGps} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !seriesId}>
          {t.common.add}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dashboard variant — series is selected inside the dialog
// ---------------------------------------------------------------------------

export function AddEntryFromDashboardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AddEntryWithSeriesForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddEntryWithSeriesForm({ onClose }: { onClose: () => void }) {
  const { series } = useSeriesList();
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const { entries } = useEntries(selectedSeriesId);
  const [defaultTimestamp] = useState(() => new Date().toISOString());

  const seriesSlot = (
    <div className="space-y-2">
      <Label>{t.entries.seriesLabel}</Label>
      <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
        <SelectTrigger>
          <SelectValue placeholder={t.entries.selectSeriesPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {series.map((s: Series) => (
            <SelectItem key={s._id} value={s._id}>
              {s.title || t.series.untitled}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AddEntryForm
      key={selectedSeriesId}
      seriesId={selectedSeriesId}
      entries={entries}
      defaultTimestamp={defaultTimestamp}
      onClose={onClose}
      seriesSelectorSlot={seriesSlot}
    />
  );
}
