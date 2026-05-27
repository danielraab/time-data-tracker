"use client";

import { useMemo, useState } from "react";
import { Archive, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddEntryFromDashboardDialog } from "@/components/entries/add-entry-dialog";
import { NewSeriesDialog } from "@/components/series/new-series-dialog";
import {
  useAllEntries,
  useArchivedSeriesList,
  useSeriesList,
} from "@/lib/db/hooks";
import { hasOpenSpan, openStarts } from "@/lib/spans";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";
import { SeriesCard } from "./series-card";

export function SeriesList() {
  const { series, loading } = useSeriesList();
  const { series: archivedSeries } = useArchivedSeriesList();
  const { entries } = useAllEntries();
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [newSeriesOpen, setNewSeriesOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const entriesBySeries = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = map.get(entry.seriesId) ?? [];
      list.push(entry);
      map.set(entry.seriesId, list);
    }
    return map;
  }, [entries]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const tag of s.tags) set.add(tag);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [series]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchQuery = (title: string) => !q || title.toLowerCase().includes(q);
    const matchTags = (tags: string[]) =>
      selectedTags.length === 0 || selectedTags.some((t) => tags.includes(t));

    return series
      .filter((s) => matchQuery(s.title) && matchTags(s.tags))
      .map((s) => {
        const seriesEntries = entriesBySeries.get(s._id) ?? [];
        return {
          series: s,
          entryCount: seriesEntries.length,
          hasOpenSpan: hasOpenSpan(seriesEntries),
          openStartId: openStarts(seriesEntries)[0]?._id ?? null,
        };
      })
      .sort((a, b) => {
        if (a.hasOpenSpan !== b.hasOpenSpan) return a.hasOpenSpan ? -1 : 1;
        return b.series.updatedAt.localeCompare(a.series.updatedAt);
      });
  }, [series, entriesBySeries, query, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const isEmpty = !loading && series.length === 0;
  const noMatches = !loading && series.length > 0 && filtered.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.dashboard.title}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAddEntryOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t.dashboard.addEntry}</span>
          </Button>
          <Button onClick={() => setNewSeriesOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t.dashboard.newSeries}</span>
          </Button>
        </div>
      </div>

      {series.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.searchPlaceholder}
              className="pl-9"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t.dashboard.filterByTags}:
              </span>
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="rounded-full"
                  >
                    <Badge
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer font-normal"
                    >
                      {tag}
                    </Badge>
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                >
                  <X className="size-3" />
                  {t.dashboard.clearFilters}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : isEmpty ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t.dashboard.empty}
        </p>
      ) : noMatches ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t.dashboard.noMatches}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(({ series, entryCount, hasOpenSpan, openStartId }) => (
            <SeriesCard
              key={series._id}
              series={series}
              entryCount={entryCount}
              hasOpenSpan={hasOpenSpan}
              openStartId={openStartId}
            />
          ))}
        </div>
      )}

      <AddEntryFromDashboardDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
      />

      <NewSeriesDialog open={newSeriesOpen} onOpenChange={setNewSeriesOpen} />

      {archivedSeries.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setShowArchived((v) => !v)}
        >
          <Archive className="size-4" />
          {showArchived ? t.dashboard.hideArchived : t.dashboard.showArchived}
        </Button>
      )}

      {showArchived && archivedSeries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.dashboard.archivedSection}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-60">
            {archivedSeries.map((s) => (
              <SeriesCard
                key={s._id}
                series={s}
                entryCount={entriesBySeries.get(s._id)?.length ?? 0}
                hasOpenSpan={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
