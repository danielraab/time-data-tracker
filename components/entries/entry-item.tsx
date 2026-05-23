"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CircleDot,
  Hash,
  MapPin,
  Pencil,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/lib/db/entries-repo";
import {
  formatDateTime,
  formatDurationBetween,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import type { Entry, EntryType } from "@/lib/types";

function TypeIcon({ type }: { type: EntryType }) {
  switch (type) {
    case "point_label":
      return <CircleDot className="size-4" />;
    case "point_number":
      return <Hash className="size-4" />;
    case "span_start":
      return <Play className="size-4" />;
    case "span_end":
      return <Square className="size-4" />;
  }
}

interface EntryItemProps {
  entry: Entry;
  pairedEnd: Entry | null;
  pairedStart: Entry | null;
  isOpen: boolean;
}

export function EntryItem({
  entry,
  pairedEnd,
  pairedStart,
  isOpen,
}: EntryItemProps) {
  const [editing, setEditing] = useState(false);
  const [timeLocal, setTimeLocal] = useState(toDateTimeLocal(entry.timestamp));
  const [label, setLabel] = useState(entry.label ?? "");
  const [valueText, setValueText] = useState(
    entry.value !== undefined ? String(entry.value) : "",
  );
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      const patch: Parameters<typeof updateEntry>[1] = {
        timestamp: fromDateTimeLocal(timeLocal),
        label: label.trim() || undefined,
      };
      if (entry.entryType === "point_number") {
        const n = Number(valueText);
        if (Number.isFinite(n)) patch.value = n;
      }
      await updateEntry(entry._id, patch);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setTimeLocal(toDateTimeLocal(entry.timestamp));
    setLabel(entry.label ?? "");
    setValueText(entry.value !== undefined ? String(entry.value) : "");
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm(t.common.confirmDelete)) return;
    await deleteEntry(entry._id);
  }

  async function handleCloseSpan() {
    if (busy) return;
    setBusy(true);
    try {
      await createEntry({
        seriesId: entry.seriesId,
        entryType: "span_end",
        timestamp: new Date().toISOString(),
        startEntryId: entry._id,
        label: entry.label,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "rounded-lg border border-border bg-card p-3",
        isOpen &&
          "border-amber-500/60 bg-amber-50/40 dark:bg-amber-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">
          <TypeIcon type={entry.entryType} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {formatDateTime(entry.timestamp)}
            </span>
            {entry.entryType === "span_start" && pairedEnd && (
              <Badge variant="outline" className="font-normal">
                {formatDurationBetween(entry.timestamp, pairedEnd.timestamp)}
              </Badge>
            )}
            {entry.entryType === "span_end" && pairedStart && (
              <Badge variant="outline" className="font-normal">
                {formatDurationBetween(pairedStart.timestamp, entry.timestamp)}
              </Badge>
            )}
            {isOpen && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/60 font-normal text-amber-700 dark:text-amber-400"
              >
                <AlertCircle className="size-3" />
                {t.entries.openSpanNote}
              </Badge>
            )}
            {entry.gps && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {entry.gps.lat.toFixed(3)}, {entry.gps.lng.toFixed(3)}
              </span>
            )}
          </div>

          {editing ? (
            <div className="space-y-2 pt-2">
              <Input
                type="datetime-local"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
              />
              {entry.entryType === "point_number" ? (
                <Input
                  type="number"
                  inputMode="decimal"
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                />
              ) : (
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t.entries.labelLabel}
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={busy}>
                  <Check className="size-4" />
                  {t.common.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="size-4" />
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          ) : entry.entryType === "point_number" ? (
            <p className="text-sm font-medium">
              {entry.value}
              {entry.label && (
                <span className="ml-2 font-normal text-muted-foreground">
                  · {entry.label}
                </span>
              )}
            </p>
          ) : entry.label ? (
            <p className="text-sm font-medium">{entry.label}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t.entries.types[entry.entryType]}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            {entry.entryType === "span_start" && !pairedEnd && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCloseSpan}
                disabled={busy}
              >
                <Square className="size-4" />
                {t.entries.closeSpan}
              </Button>
            )}
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
