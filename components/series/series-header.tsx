"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteSeries, updateSeries } from "@/lib/db/series-repo";
import { t } from "@/lib/i18n/en";
import type { Series } from "@/lib/types";
import { TagInput } from "./tag-input";

export function SeriesHeader({ series }: { series: Series }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description);
  const [tags, setTags] = useState<string[]>(series.tags);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateSeries(series._id, { title, description, tags });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setTitle(series.title);
    setDescription(series.description);
    setTags(series.tags);
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm(t.common.confirmDelete)) return;
    await deleteSeries(series._id);
    router.push("/");
  }

  if (editing) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">{t.series.titleLabel}</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">{t.series.descriptionLabel}</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-tags">{t.series.tagsLabel}</Label>
          <TagInput
            id="edit-tags"
            value={tags}
            onChange={setTags}
            placeholder={t.series.tagsPlaceholder}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {t.common.save}
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {series.title || t.series.untitled}
        </h1>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t.common.edit}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            aria-label={t.series.deleteSeries}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {series.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {series.description}
        </p>
      )}
      {series.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {series.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
