"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CircleDot,
  Clock,
  Play,
  Square,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QuickLabelModal } from "@/components/entries/quick-label-modal";
import { createEntry } from "@/lib/db/entries-repo";
import { useSyncContext } from "@/lib/db/sync-context";
import { t } from "@/lib/i18n/en";
import type { Series } from "@/lib/types";
import { consumeLongPress, useLongPress } from "@/lib/use-long-press";
import { seriesPath } from "@/lib/url";

interface SeriesCardProps {
  series: Series;
  entryCount: number;
  hasOpenSpan: boolean;
  openStartId?: string | null;
}

export function SeriesCard({
  series,
  entryCount,
  hasOpenSpan,
  openStartId,
}: SeriesCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"point_label" | "span_start">(
    "point_label",
  );
  const { trigger: syncNow } = useSyncContext();

  const pointLongPress = useLongPress(() => {
    setModalType("point_label");
    setModalOpen(true);
  });

  const durationLongPress = useLongPress(() => {
    setModalType("span_start");
    setModalOpen(true);
  });

  async function addPoint(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (consumeLongPress(pointLongPress.isLongPress)) return;
    await createEntry({
      seriesId: series._id,
      entryType: "point_label",
      timestamp: new Date().toISOString(),
    });
    syncNow();
    toast.success(t.dashboard.quickAddPointAdded);
  }

  async function startDuration(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (consumeLongPress(durationLongPress.isLongPress)) return;
    await createEntry({
      seriesId: series._id,
      entryType: "span_start",
      timestamp: new Date().toISOString(),
    });
    syncNow();
    toast.success(t.dashboard.quickAddDurationStarted);
  }

  async function endDuration(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!openStartId) return;
    await createEntry({
      seriesId: series._id,
      entryType: "span_end",
      timestamp: new Date().toISOString(),
      startEntryId: openStartId,
    });
    syncNow();
    toast.success(t.dashboard.quickAddDurationEnded);
  }

  return (
    <>
      <Link
        href={seriesPath(series)}
        className="block transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <Card
          className={
            hasOpenSpan
              ? "border-amber-500/60 bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
              : "hover:bg-muted/50"
          }
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <CardTitle className="text-base truncate">
                  {series.title || t.series.untitled}
                </CardTitle>
                {series.isDefault && (
                  <span title={t.series.isDefault}>
                    <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  </span>
                )}
              </div>
              {hasOpenSpan && (
                <Badge
                  variant="outline"
                  className="border-amber-500/60 text-amber-700 dark:text-amber-400 shrink-0"
                >
                  <AlertCircle className="size-3" />
                  {t.dashboard.openSpan}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {series.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {series.description}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {t.dashboard.entryCount(entryCount)}
                </span>
                {series.tags.length > 0 && (
                  <span aria-hidden="true" className="text-muted-foreground/50">
                    ·
                  </span>
                )}
                {series.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
              {!series.isArchived && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={t.dashboard.quickAddPoint}
                    onClick={addPoint}
                    {...pointLongPress.handlers}
                  >
                    <CircleDot className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={t.dashboard.quickAddStartDuration}
                    onClick={startDuration}
                    {...durationLongPress.handlers}
                  >
                    <Play className="size-4" />
                  </Button>
                  {openStartId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={t.dashboard.quickAddEndDuration}
                      onClick={endDuration}
                    >
                      <Square className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
      <QuickLabelModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        seriesId={series._id}
        entryType={modalType}
      />
    </>
  );
}
