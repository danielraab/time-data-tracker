"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  MapPin,
  Pencil,
  Play,
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
import { createEntry, deleteEntry, updateEntry } from "@/lib/db/entries-repo";
import {
  formatDateTime,
  formatDurationBetween,
  formatDurationDetailed,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { orphanEndsAfter } from "@/lib/spans";
import { useSyncContext } from "@/lib/db/sync-context";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";

const NO_LINK = "__none__";

interface OpenStartItemProps {
  entry: Entry;
  allEntries: Entry[];
  readOnly?: boolean;
}

export function OpenStartItem({
  entry,
  allEntries,
  readOnly = false,
}: OpenStartItemProps) {
  const now = useNow(10_000);
  const [editing, setEditing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [timeLocal, setTimeLocal] = useState(toDateTimeLocal(entry.timestamp));
  const [label, setLabel] = useState(entry.label ?? "");
  const [linkedEndId, setLinkedEndId] = useState(NO_LINK);
  const [busy, setBusy] = useState(false);
  const { trigger: syncNow } = useSyncContext();

  // Candidate ends must come AFTER the (in-progress) start timestamp.
  const candidateEnds = useMemo(() => {
    try {
      return orphanEndsAfter(allEntries, fromDateTimeLocal(timeLocal));
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
      });
      if (linkedEndId !== NO_LINK) {
        await updateEntry(linkedEndId, { startEntryId: entry._id });
      }
      syncNow();
      setEditing(false);
      setLinkedEndId(NO_LINK);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setTimeLocal(toDateTimeLocal(entry.timestamp));
    setLabel(entry.label ?? "");
    setLinkedEndId(NO_LINK);
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm(t.common.confirmDelete)) return;
    await deleteEntry(entry._id);
    syncNow();
  }

  async function handleCloseNow() {
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
      syncNow();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-amber-500/60 bg-amber-50/40 p-3 dark:bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-amber-500 dark:text-amber-400">
          <Play className="size-4" />
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
              {t.entries.openSpanNote}
            </Badge>
            {now && (
              <Badge variant="outline" className="font-normal">
                {formatDurationBetween(
                  entry.timestamp,
                  new Date(now).toISOString(),
                )}
              </Badge>
            )}
            {entry.gps && (
              <>
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
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
                  {t.entries.linkedEndLabel}
                </Label>
                {candidateEnds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t.entries.noEndCandidates}
                  </p>
                ) : (
                  <Select value={linkedEndId} onValueChange={setLinkedEndId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>
                        {t.entries.noLink}
                      </SelectItem>
                      {candidateEnds.map((end) => (
                        <SelectItem key={end._id} value={end._id}>
                          {end.label || t.entries.types.span_end} ·{" "}
                          {formatDateTime(end.timestamp)}
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
            <p className="text-sm font-medium">
              {entry.label}
              {now && (
                <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                  {formatDurationDetailed(
                    entry.timestamp,
                    new Date(now).toISOString(),
                  )}{" "}
                  {t.entries.untilNow}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t.entries.types.span_start}
              {now && (
                <span className="ml-2 not-italic text-xs tabular-nums">
                  {formatDurationDetailed(
                    entry.timestamp,
                    new Date(now).toISOString(),
                  )}{" "}
                  {t.entries.untilNow}
                </span>
              )}
            </p>
          )}
        </div>

        {!editing && !readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCloseNow}
              disabled={busy}
              aria-label={t.entries.closeSpan}
            >
              <Square className="size-4" />
              <span className="hidden sm:inline">{t.entries.closeSpan}</span>
            </Button>
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
