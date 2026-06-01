"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil, RotateCcw, Trash2, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTrashItems, useAllSeriesMap } from "@/lib/db/hooks";
import { purgeSeries, restoreSeries, updateSeries } from "@/lib/db/series-repo";
import {
  purgeEntry,
  restoreEntry,
  updateEntry,
} from "@/lib/db/entries-repo";
import { getDeletionAgeDays, isPurgeEligible, isOwner } from "@/lib/db/trash";
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { t } from "@/lib/i18n/en";
import { useSession } from "@/lib/auth-client";
import { TagInput } from "@/components/series/tag-input";
import type { Entry } from "@/lib/types";
import type { TrashGroup } from "@/lib/db/trash";

function PurgeEligibilityBadge({ deletedAt }: { deletedAt: string }) {
  const now = new Date().toISOString();
  const eligible = isPurgeEligible(deletedAt, now);
  const ageDays = getDeletionAgeDays(deletedAt, now);
  if (eligible) {
    return (
      <Badge variant="destructive" className="text-xs shrink-0">
        {t.trash.purgeEligible}
      </Badge>
    );
  }
  const daysLeft = 30 - ageDays;
  return (
    <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
      {t.trash.daysUntilPurge(daysLeft)}
    </Badge>
  );
}

function DeletionMeta({ deletedAt }: { deletedAt: string }) {
  const ageDays = getDeletionAgeDays(deletedAt, new Date().toISOString());
  return (
    <span className="text-xs text-muted-foreground">
      {t.trash.deletedAgo(ageDays)} · {formatDateTime(deletedAt)}
    </span>
  );
}

function SeriesTrashCard({
  group,
  currentUserId,
}: {
  group: TrashGroup;
  currentUserId: string | null;
}) {
  const { series, entries } = group;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description);
  const [tags, setTags] = useState<string[]>(series.tags);
  const canPurge = isOwner(series.ownerId, currentUserId);

  async function handleSave() {
    if (busy || !title.trim()) return;
    setBusy(true);
    try {
      await updateSeries(series._id, { title, description, tags });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function handleCancelEdit() {
    setTitle(series.title);
    setDescription(series.description);
    setTags(series.tags);
    setEditing(false);
  }

  async function handleRestore() {
    setBusy(true);
    try {
      await restoreSeries(series._id);
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    if (!canPurge) return;
    if (!window.confirm(t.trash.confirmPurge)) return;
    setBusy(true);
    try {
      await purgeSeries(series._id, currentUserId);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>{t.series.titleLabel}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t.series.descriptionLabel}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t.series.tagsLabel}</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder={t.series.tagsPlaceholder}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={busy || !title.trim()}
            >
              <Check className="size-3.5" />
              {t.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="size-3.5" />
              {t.common.cancel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {series.title || t.series.untitled}
          </CardTitle>
          <PurgeEligibilityBadge deletedAt={series.deletedAt!} />
        </div>
        {series.description && (
          <p className="text-sm text-muted-foreground">{series.description}</p>
        )}
        {series.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {series.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <DeletionMeta deletedAt={series.deletedAt!} />
          <span className="text-xs text-muted-foreground">
            {t.trash.childEntryCount(entries.length)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
            {t.common.edit}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={handleRestore}
          >
            <RotateCcw className="size-3.5" />
            {t.trash.restore}
          </Button>
          {canPurge ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={handlePurge}
            >
              <Trash2 className="size-3.5" />
              {t.trash.purge}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.trash.notOwner}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EntryTrashCard({
  entry,
  seriesTitle,
  currentUserId,
  seriesOwnerId,
}: {
  entry: Entry;
  seriesTitle: string | undefined;
  currentUserId: string | null;
  seriesOwnerId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timeLocal, setTimeLocal] = useState(toDateTimeLocal(entry.timestamp));
  const [label, setLabel] = useState(entry.label ?? "");
  const [valueText, setValueText] = useState(
    entry.value !== undefined ? String(entry.value) : "",
  );
  const canPurge = isOwner(seriesOwnerId, currentUserId);
  const isNumber = entry.entryType === "point_number";

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      const patch: Parameters<typeof updateEntry>[1] = {
        timestamp: fromDateTimeLocal(timeLocal),
        label: label.trim() || undefined,
      };
      if (isNumber) {
        const n = Number(valueText);
        if (Number.isFinite(n)) patch.value = n;
      }
      await updateEntry(entry._id, patch);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function handleCancelEdit() {
    setTimeLocal(toDateTimeLocal(entry.timestamp));
    setLabel(entry.label ?? "");
    setValueText(entry.value !== undefined ? String(entry.value) : "");
    setEditing(false);
  }

  async function handleRestore() {
    setBusy(true);
    try {
      await restoreEntry(entry._id);
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    if (!canPurge) return;
    if (!window.confirm(t.trash.confirmPurge)) return;
    setBusy(true);
    try {
      await purgeEntry(entry._id);
    } finally {
      setBusy(false);
    }
  }

  const displayLabel =
    entry.label ?? (entry.value !== undefined ? String(entry.value) : null);

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>{t.entries.timeLabel}</Label>
            <Input
              type="datetime-local"
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
            />
          </div>
          {isNumber ? (
            <div className="space-y-1.5">
              <Label>{t.entries.valueLabel}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t.entries.labelLabel}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.entries.labelLabel}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={busy}>
              <Check className="size-3.5" />
              {t.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="size-3.5" />
              {t.common.cancel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            {formatDateTime(entry.timestamp)}
            {displayLabel && (
              <span className="ml-2 text-muted-foreground font-normal">
                {displayLabel}
              </span>
            )}
          </CardTitle>
          <PurgeEligibilityBadge deletedAt={entry.deletedAt!} />
        </div>
        {seriesTitle && (
          <p className="text-xs text-muted-foreground">
            {t.trash.parentSeries}: {seriesTitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <DeletionMeta deletedAt={entry.deletedAt!} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
            {t.common.edit}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={handleRestore}
          >
            <RotateCcw className="size-3.5" />
            {t.trash.restore}
          </Button>
          {canPurge ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={handlePurge}
            >
              <Trash2 className="size-3.5" />
              {t.trash.purge}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.trash.notOwner}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TrashView() {
  const { seriesGroups, standaloneEntries, loading } = useTrashItems();
  const activeSeriesMap = useAllSeriesMap();
  const { data: session } = useSession();
  const currentUserId = session?.user.id ?? null;

  const isEmpty =
    !loading && seriesGroups.length === 0 && standaloneEntries.length === 0;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft className="size-4" />
          {t.trash.backToHome}
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">{t.trash.title}</h1>

      {loading && (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      )}

      {isEmpty && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t.trash.empty}
        </p>
      )}

      {seriesGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.trash.seriesSection}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {seriesGroups.map((group) => (
              <SeriesTrashCard
                key={group.series._id}
                group={group}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </section>
      )}

      {standaloneEntries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.trash.entriesSection}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {standaloneEntries.map((entry) => {
              const parentSeries = activeSeriesMap.get(entry.seriesId);
              return (
                <EntryTrashCard
                  key={entry._id}
                  entry={entry}
                  seriesTitle={parentSeries?.title}
                  currentUserId={currentUserId}
                  seriesOwnerId={parentSeries?.ownerId ?? null}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
