"use client";

import { Hash, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateTimeLocal } from "@/lib/format";
import { t } from "@/lib/i18n/en";

export interface PointPartProps {
  timeLocal: string;
  onTimeChange: (v: string) => void;
  entryType: "point_label" | "point_number";
  onTypeChange: (t: "point_label" | "point_number") => void;
  label: string;
  onLabelChange: (v: string) => void;
  valueText: string;
  onValueChange: (v: string) => void;
}

export function PointPart({
  timeLocal,
  onTimeChange,
  entryType,
  onTypeChange,
  label,
  onLabelChange,
  valueText,
  onValueChange,
}: PointPartProps) {
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
              entryType === "point_label"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onTypeChange("point_label")}
          >
            <Type className="size-3" />
            {t.entries.subText}
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 border-l px-2.5 py-2 text-xs font-medium transition-colors ${
              entryType === "point_number"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onTypeChange("point_number")}
          >
            <Hash className="size-3" />
            {t.entries.subNumber}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2">
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
                ? onValueChange(e.target.value)
                : onLabelChange(e.target.value)
            }
            required={entryType === "point_number"}
          />
        </div>
      </div>
    </>
  );
}
