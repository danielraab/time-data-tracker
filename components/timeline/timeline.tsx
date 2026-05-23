"use client";

import { useMemo, type MouseEvent } from "react";
import { orphanEnds, pairSpans } from "@/lib/spans";
import { formatDateTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/types";

interface TimelineProps {
  entries: Entry[];
  onPickTime?: (iso: string) => void;
}

const HOUR_MS = 60 * 60 * 1000;

export function Timeline({ entries, onPickTime }: TimelineProps) {
  const now = useNow();

  const range = useMemo(() => {
    const times = entries.map((e) => new Date(e.timestamp).getTime());
    if (now !== null) times.push(now);
    if (times.length === 0) return null;
    let startMs = Math.min(...times);
    let endMs = Math.max(...times);
    if (startMs === endMs) {
      startMs -= HOUR_MS;
      endMs += HOUR_MS;
    }
    const pad = (endMs - startMs) * 0.05;
    return { startMs: startMs - pad, endMs: endMs + pad };
  }, [entries, now]);

  const pairs = useMemo(() => pairSpans(entries), [entries]);
  const orphans = useMemo(() => orphanEnds(entries), [entries]);
  const points = useMemo(
    () =>
      entries.filter(
        (e) => e.entryType === "point_label" || e.entryType === "point_number",
      ),
    [entries],
  );

  if (!range) {
    return (
      <div className="h-28 rounded-lg border border-dashed border-border bg-card" />
    );
  }

  const toPct = (ms: number) =>
    ((ms - range.startMs) / (range.endMs - range.startMs)) * 100;
  const pctIso = (iso: string) => toPct(new Date(iso).getTime());

  const nowPct = now !== null ? toPct(now) : null;
  const nowInRange = nowPct !== null && nowPct >= 0 && nowPct <= 100;
  const openEndPct = nowPct ?? 100;

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!onPickTime || !range) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const ms = range.startMs + fraction * (range.endMs - range.startMs);
    onPickTime(new Date(ms).toISOString());
  }

  return (
    <div className="space-y-2">
      <div
        onClick={onPickTime ? handleClick : undefined}
        className={cn(
          "relative h-28 select-none rounded-lg border border-border bg-card",
          onPickTime && "cursor-crosshair",
        )}
      >
        <div className="absolute left-2 right-2 top-1/2 h-px bg-border" />

        {nowInRange && (
          <div
            className="pointer-events-none absolute bottom-1 top-1"
            style={{ left: `${nowPct}%` }}
          >
            <div className="h-full w-px bg-foreground/30" />
            <span className="absolute -top-1 -translate-x-1/2 rounded bg-foreground/70 px-1 text-[10px] text-background">
              {t.timeline.now}
            </span>
          </div>
        )}

        {pairs.map(({ start, end }) => {
          const left = pctIso(start.timestamp);
          const right = end ? pctIso(end.timestamp) : openEndPct;
          const width = Math.max(0.5, right - left);
          const open = end === null;
          return (
            <div
              key={start._id}
              title={start.label || t.entries.types.span_start}
              style={{ left: `${left}%`, width: `${width}%` }}
              className={cn(
                "absolute top-1/2 h-3 -translate-y-1/2 rounded",
                open
                  ? "border border-amber-500 bg-amber-400/60"
                  : "border border-primary/50 bg-primary/30",
              )}
            />
          );
        })}

        {orphans.map((entry) => (
          <div
            key={entry._id}
            title={entry.label || t.entries.types.span_end}
            style={{ left: `calc(${pctIso(entry.timestamp)}% - 4px)` }}
            className="absolute top-1/2 size-2 -translate-y-1/2 rounded-sm bg-amber-500"
          />
        ))}

        {points.map((entry) => (
          <div
            key={entry._id}
            title={`${formatDateTime(entry.timestamp)}${
              entry.label ? ` · ${entry.label}` : ""
            }${entry.value !== undefined ? ` · ${entry.value}` : ""}`}
            style={{ left: `calc(${pctIso(entry.timestamp)}% - 4px)` }}
            className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary"
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(range.startMs).toLocaleString()}</span>
        <span>{new Date(range.endMs).toLocaleString()}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {entries.length === 0
          ? t.timeline.empty
          : onPickTime
            ? t.timeline.clickHint
            : null}
      </p>
    </div>
  );
}
