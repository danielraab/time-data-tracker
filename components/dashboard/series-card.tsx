"use client";

import Link from "next/link";
import { AlertCircle, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/en";
import type { Series } from "@/lib/types";
import { seriesPath } from "@/lib/url";

interface SeriesCardProps {
  series: Series;
  entryCount: number;
  hasOpenSpan: boolean;
}

export function SeriesCard({
  series,
  entryCount,
  hasOpenSpan,
}: SeriesCardProps) {
  return (
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
        </CardContent>
      </Card>
    </Link>
  );
}
