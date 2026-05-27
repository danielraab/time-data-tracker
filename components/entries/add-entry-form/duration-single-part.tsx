"use client";

import { useMemo } from "react";
import { Play, Square } from "lucide-react";
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
import { openStartsBefore } from "@/lib/spans";
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";

export interface DurationSinglePartProps {
  timeLocal: string;
  onTimeChange: (v: string) => void;
  entryType: "span_start" | "span_end";
  onTypeChange: (t: "span_start" | "span_end") => void;
  label: string;
  onLabelChange: (v: string) => void;
  entries: Entry[];
  linkedStartId: string;
  onLinkedStartChange: (id: string) => void;
}

export function DurationSinglePart({
  timeLocal,
  onTimeChange,
  entryType,
  onTypeChange,
  label,
  onLabelChange,
  entries,
  linkedStartId,
  onLinkedStartChange,
}: DurationSinglePartProps) {
  const candidateStarts = useMemo(() => {
    try {
      return openStartsBefore(entries, fromDateTimeLocal(timeLocal));
    } catch {
      return [];
    }
  }, [entries, timeLocal]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="entry-time">{t.entries.timeLabel}</Label>
        <div className="flex gap-2">
          <Input
            id="entry-time"
            type="datetime-local"
            value={timeLocal}
            onChange={(e) => onTimeChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onTimeChange(toDateTimeLocal(new Date().toISOString()))
            }
          >
            {t.entries.now}
          </Button>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="inline-flex shrink-0 self-end overflow-hidden rounded-md border">
          <button
            type="button"
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors ${
              entryType === "span_start"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onTypeChange("span_start")}
          >
            <Play className="size-3" />
            {t.entries.subStart}
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 border-l px-2.5 py-2 text-xs font-medium transition-colors ${
              entryType === "span_end"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onTypeChange("span_end")}
          >
            <Square className="size-3" />
            {t.entries.subEnd}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="entry-label">
            {t.entries.labelLabel}{" "}
            <span className="text-xs text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <Input
            id="entry-label"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
          />
        </div>
      </div>
      {entryType === "span_end" && (
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
                onLinkedStartChange(v === "__none__" ? "" : v)
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
    </>
  );
}
