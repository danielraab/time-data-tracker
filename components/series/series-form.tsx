"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSeries } from "@/lib/db/series-repo";
import { seriesPath } from "@/lib/url";
import { TagInput } from "./tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n/en";

export function SeriesForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim() || saving) return;
        setSaving(true);
        try {
          const series = await createSeries({ title, description, tags });
          router.push(seriesPath(series));
        } catch {
          setSaving(false);
        }
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="series-title">{t.series.titleLabel}</Label>
        <Input
          id="series-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.series.titlePlaceholder}
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="series-description">{t.series.descriptionLabel}</Label>
        <Textarea
          id="series-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.series.descriptionPlaceholder}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="series-tags">{t.series.tagsLabel}</Label>
        <TagInput
          id="series-tags"
          value={tags}
          onChange={setTags}
          placeholder={t.series.tagsPlaceholder}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!title.trim() || saving}>
          {t.series.create}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
