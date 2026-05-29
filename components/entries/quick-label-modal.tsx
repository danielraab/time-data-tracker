"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEntry } from "@/lib/db/entries-repo";
import { t } from "@/lib/i18n/en";

interface QuickLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  entryType: "point_label" | "span_start";
}

/** Pure helper — exported for unit tests. */
export function buildQuickLabelToast(
  entryType: "point_label" | "span_start",
  label: string,
): string {
  return entryType === "span_start"
    ? t.dashboard.quickLabel.durationStarted(label)
    : t.dashboard.quickLabel.pointAdded(label);
}

/**
 * Minimal label-entry modal opened on long-press of quick-add buttons.
 * Contains only a single optional label field; all other entry fields remain
 * in the full AddEntryDialog.
 *
 * Radix Dialog unmounts content on close so form state resets automatically.
 */
export function QuickLabelModal({
  open,
  onOpenChange,
  seriesId,
  entryType,
}: QuickLabelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <QuickLabelForm
          seriesId={seriesId}
          entryType={entryType}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface QuickLabelFormProps {
  seriesId: string;
  entryType: "point_label" | "span_start";
  onClose: () => void;
}

function QuickLabelForm({ seriesId, entryType, onClose }: QuickLabelFormProps) {
  const [label, setLabel] = useState("");

  const title =
    entryType === "span_start"
      ? t.dashboard.quickLabel.durationTitle
      : t.dashboard.quickLabel.pointTitle;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = label.trim();
    await createEntry({
      seriesId,
      entryType,
      timestamp: new Date().toISOString(),
      ...(trimmedLabel ? { label: trimmedLabel } : {}),
    });
    toast.success(buildQuickLabelToast(entryType, trimmedLabel));
    onClose();
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="quick-label-input">{t.entries.labelLabel}</Label>
        <Input
          id="quick-label-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.dashboard.quickLabel.labelPlaceholder}
          autoFocus
          className="mt-1.5"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button type="submit">{t.dashboard.quickLabel.submit}</Button>
      </DialogFooter>
    </form>
  );
}
