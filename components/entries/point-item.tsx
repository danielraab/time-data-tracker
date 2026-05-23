"use client";

import { useState } from "react";
import {
  Check,
  CircleDot,
  Hash,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteEntry, updateEntry } from "@/lib/db/entries-repo";
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";

export function PointItem({ entry }: { entry: Entry }) {
  const isNumber = entry.entryType === "point_number";
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
      if (isNumber) {
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

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">
          {isNumber ? (
            <Hash className="size-4" />
          ) : (
            <CircleDot className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {formatDateTime(entry.timestamp)}
            </span>
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
              {isNumber ? (
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
          ) : isNumber ? (
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
