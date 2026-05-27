"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n/en";

export interface DurationFullPartProps {
  timeLocal: string;
  onTimeChange: (v: string) => void;
  endTimeLocal: string;
  onEndTimeChange: (v: string) => void;
  label: string;
  onLabelChange: (v: string) => void;
}

export function DurationFullPart({
  timeLocal,
  onTimeChange,
  endTimeLocal,
  onEndTimeChange,
  label,
  onLabelChange,
}: DurationFullPartProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="entry-start-time">{t.entries.subStart}</Label>
        <Input
          id="entry-start-time"
          type="datetime-local"
          value={timeLocal}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="entry-end-time">{t.entries.subEnd}</Label>
        <Input
          id="entry-end-time"
          type="datetime-local"
          value={endTimeLocal}
          onChange={(e) => onEndTimeChange(e.target.value)}
        />
      </div>
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
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>
    </div>
  );
}
