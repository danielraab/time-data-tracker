"use client";

import { Dot, Timer } from "lucide-react";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n/en";

export interface TypeSwitchProps {
  isPoint: boolean;
  onToggle: (isPoint: boolean) => void;
}

export function TypeSwitch({ isPoint, onToggle }: TypeSwitchProps) {
  return (
    <div className="space-y-2">
      <Label>{t.entries.typeLabel}</Label>
      <div className="inline-flex overflow-hidden rounded-md border">
        <button
          type="button"
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
            isPoint ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          onClick={() => onToggle(true)}
        >
          <Dot className="size-4" />
          {t.entries.modePoint}
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 border-l px-4 py-2 text-sm font-medium transition-colors ${
            !isPoint ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          onClick={() => onToggle(false)}
        >
          <Timer className="size-4" />
          {t.entries.modeDuration}
        </button>
      </div>
    </div>
  );
}
