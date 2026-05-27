"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddEntryDialog } from "@/components/entries/add-entry-dialog";
import { EntryList } from "@/components/entries/entry-list";
import { SeriesMapModal } from "@/components/entries/series-map-modal";
import { Timeline } from "@/components/timeline/timeline";
import { useEntries, useSeries } from "@/lib/db/hooks";
import { formatDateTime, formatDurationDetailed } from "@/lib/format";
import { t } from "@/lib/i18n/en";
import { sumDurationsForDay } from "@/lib/spans";
import { useNow } from "@/lib/use-now";
import type { EntryType } from "@/lib/types";
import { SeriesHeader } from "./series-header";

export function SeriesDetail({ id }: { id: string }) {
  const { series, loading } = useSeries(id);
  const { entries } = useEntries(id);
  const now = useNow();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [defaultTimestamp, setDefaultTimestamp] = useState<string>("");
  const [defaultEndTimestamp, setDefaultEndTimestamp] = useState<
    string | undefined
  >();
  const [defaultType, setDefaultType] = useState<EntryType | undefined>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const handleDayChange = useCallback((day: Date) => setSelectedDay(day), []);

  const totalDurationMs = useMemo(() => {
    if (!selectedDay || now === null) return 0;
    const dayStartMs = selectedDay.getTime();
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
    return sumDurationsForDay(entries, dayStartMs, dayEndMs, now);
  }, [entries, selectedDay, now]);

  const mapPoints = useMemo(
    () =>
      entries
        .filter((e) => e.gps != null)
        .map((e) => ({
          lat: e.gps!.lat,
          lng: e.gps!.lng,
          popup: [formatDateTime(e.timestamp), e.label]
            .filter(Boolean)
            .join(" · "),
        })),
    [entries],
  );

  function openDialog(opts?: {
    timestamp?: string;
    endTimestamp?: string;
    type?: EntryType;
  }) {
    setDefaultTimestamp(opts?.timestamp ?? new Date().toISOString());
    setDefaultEndTimestamp(opts?.endTimestamp);
    setDefaultType(opts?.type);
    setDialogOpen(true);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;
  }
  if (!series) {
    return <p className="text-sm text-muted-foreground">{t.series.notFound}</p>;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft className="size-4" />
          {t.common.back}
        </Link>
      </Button>

      <SeriesHeader series={series} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t.timeline.heading}
        </h2>
        <Timeline
          entries={entries}
          onDayChange={handleDayChange}
          onPickTime={
            series.isArchived
              ? undefined
              : (ts) => openDialog({ timestamp: ts })
          }
          onCreateDuration={
            series.isArchived
              ? undefined
              : (startIso, endIso) =>
                  openDialog({ timestamp: startIso, endTimestamp: endIso })
          }
        />
        {totalDurationMs > 0 && (
          <p className="text-sm text-muted-foreground">
            {t.timeline.totalDuration}:{" "}
            <span className="font-medium text-foreground">
              {formatDurationDetailed(
                new Date(0).toISOString(),
                new Date(totalDurationMs).toISOString(),
              )}
            </span>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.entries.heading}
          </h2>
          <div className="flex items-center gap-2">
            {mapPoints.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMapOpen(true)}
              >
                <Map className="size-4" />
                {t.series.showOnMap}
              </Button>
            )}
            {!series.isArchived && (
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="size-4" />
                {t.entries.addEntry}
              </Button>
            )}
          </div>
        </div>
        <EntryList entries={entries} readOnly={!!series.isArchived} />
      </section>

      <AddEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        seriesId={id}
        entries={entries}
        defaultTimestamp={defaultTimestamp}
        defaultEndTimestamp={defaultEndTimestamp}
        defaultType={defaultType}
      />

      {mapPoints.length > 0 && (
        <SeriesMapModal
          title={series.title}
          points={mapPoints}
          open={mapOpen}
          onOpenChange={setMapOpen}
        />
      )}
    </div>
  );
}
