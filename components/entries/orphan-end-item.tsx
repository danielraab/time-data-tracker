"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  MapPin,
  Pencil,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { LocationMapModal } from "./location-map-modal";
import { Badge } from "@/components/ui/badge";
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
import { deleteEntry, updateEntry } from "@/lib/db/entries-repo";
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { openStartsBefore } from "@/lib/spans";
import { useSyncContext } from "@/lib/db/sync-context";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/types";

const NO_LINK = "__none__";

interface OrphanEndItemProps {
  entry: Entry;
  allEntries: Entry[];
  readOnly?: boolean;
  onEntryFocusAction?: (isoTimestamp: string, entryId: string) => void;
}

export function OrphanEndItem({
  entry,
  allEntries,
  readOnly = false,
  onEntryFocusAction,
}: OrphanEndItemProps) {
  const [editing, setEditing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [timeLocal, setTimeLocal] = useState(toDateTimeLocal(entry.timestamp));
  const [label, setLabel] = useState(entry.label ?? "");
  const [linkedStartId, setLinkedStartId] = useState(NO_LINK);
  const [busy, setBusy] = useState(false);
  const { trigger: syncNow } = useSyncContext();

  // Candidate starts must come BEFORE the (in-progress) end timestamp.
  const candidateStarts = useMemo(() => {
    try {
      return openStartsBefore(allEntries, fromDateTimeLocal(timeLocal));
    } catch {
      return [];
    }
  }, [allEntries, timeLocal]);

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      await updateEntry(entry._id, {
        timestamp: fromDateTimeLocal(timeLocal),
        label: label.trim() || undefined,
        startEntryId: linkedStartId === NO_LINK ? undefined : linkedStartId,
      });
      syncNow();
      setEditing(false);
      setLinkedStartId(NO_LINK);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setTimeLocal(toDateTimeLocal(entry.timestamp));
    setLabel(entry.label ?? "");
    setLinkedStartId(NO_LINK);
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm(t.common.confirmDelete)) return;
    await deleteEntry(entry._id);
    syncNow();
  }

  return (
    <li
      className={cn(
        "rounded-lg border border-amber-500/60 bg-amber-50/40 p-3 dark:bg-amber-500/5",
        !editing &&
          onEntryFocusAction &&
          "cursor-pointer hover:bg-accent/40 transition-colors",
      )}
      onClick={
        !editing
          ? () => onEntryFocusAction?.(entry.timestamp, entry._id)
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground" title={entry._id}>
          <Square className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {formatDateTime(entry.timestamp)}
            </span>
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/60 font-normal text-amber-700 dark:text-amber-400"
            >
              <AlertCircle className="size-3" />
              {t.entries.orphanEndNote}
            </Badge>
            {entry.gps && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMapOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <MapPin className="size-3" />
                  {entry.gps.lat.toFixed(3)}, {entry.gps.lng.toFixed(3)}
                </button>
                <LocationMapModal
                  gps={entry.gps}
                  open={mapOpen}
                  onOpenChange={setMapOpen}
                />
              </>
            )}
          </div>

          {editing ? (
            <div className="space-y-2 pt-2">
              <Input
                type="datetime-local"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
              />
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.entries.labelLabel}
              />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t.entries.linkedStartLabel}
                </Label>
                {candidateStarts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t.entries.noStartCandidates}
                  </p>
                ) : (
                  <Select
                    value={linkedStartId}
                    onValueChange={setLinkedStartId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>
                        {t.entries.noLink}
                      </SelectItem>
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
          ) : entry.label ? (
            <p className="text-sm font-medium">{entry.label}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t.entries.types.span_end}
            </p>
          )}
        </div>

        {!editing && !readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              aria-label={t.common.edit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
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
