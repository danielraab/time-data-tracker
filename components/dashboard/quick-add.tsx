"use client";

import Link from "next/link";
import { CircleDot, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEntry } from "@/lib/db/entries-repo";
import { useDefaultSeries, useEntries } from "@/lib/db/hooks";
import { t } from "@/lib/i18n/en";
import { openStarts } from "@/lib/spans";
import { seriesPath } from "@/lib/url";

export function QuickAdd() {
  const { series, loading } = useDefaultSeries();
  const { entries } = useEntries(series?._id ?? "");

  if (loading) return null;

  if (!series) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.dashboard.noDefaultSeries}
      </p>
    );
  }

  const openStart = openStarts(entries)[0] ?? null;

  async function addPoint() {
    if (!series) return;
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: new Date().toISOString(),
    });
  }

  async function startDuration() {
    if (!series) return;
    await createEntry({
      seriesId: series._id,
      entryType: "span_start",
      timestamp: new Date().toISOString(),
    });
  }

  async function endDuration() {
    if (!series || !openStart) return;
    await createEntry({
      seriesId: series._id,
      entryType: "span_end",
      timestamp: new Date().toISOString(),
      startEntryId: openStart._id,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t.dashboard.quickAdd}</span>
        <Link
          href={seriesPath(series)}
          className="text-sm text-muted-foreground hover:text-foreground truncate max-w-[60%] text-right"
        >
          {series.title || t.series.untitled}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addPoint}>
          <CircleDot className="size-4" />
          {t.dashboard.quickAddPoint}
        </Button>
        <Button variant="outline" size="sm" onClick={startDuration}>
          <Play className="size-4" />
          {t.dashboard.quickAddStartDuration}
        </Button>
        {openStart && (
          <Button variant="outline" size="sm" onClick={endDuration}>
            <Square className="size-4" />
            {t.dashboard.quickAddEndDuration}
          </Button>
        )}
      </div>
    </div>
  );
}
