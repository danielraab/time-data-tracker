"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddEntryDialog } from "@/components/entries/add-entry-dialog";
import { EntryList } from "@/components/entries/entry-list";
import { Timeline } from "@/components/timeline/timeline";
import { useEntries, useSeries } from "@/lib/db/hooks";
import { t } from "@/lib/i18n/en";
import type { EntryType } from "@/lib/types";
import { SeriesHeader } from "./series-header";

export function SeriesDetail({ id }: { id: string }) {
  const { series, loading } = useSeries(id);
  const { entries } = useEntries(id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTimestamp, setDefaultTimestamp] = useState<string>("");
  const [defaultType, setDefaultType] = useState<EntryType | undefined>();

  function openDialog(opts?: { timestamp?: string; type?: EntryType }) {
    setDefaultTimestamp(opts?.timestamp ?? new Date().toISOString());
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
          onPickTime={(ts) => openDialog({ timestamp: ts })}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.entries.heading}
          </h2>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="size-4" />
            {t.entries.addEntry}
          </Button>
        </div>
        <EntryList entries={entries} />
      </section>

      <AddEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        seriesId={id}
        entries={entries}
        defaultTimestamp={defaultTimestamp}
        defaultType={defaultType}
      />
    </div>
  );
}
