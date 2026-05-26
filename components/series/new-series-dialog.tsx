"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeriesForm } from "./series-form";
import { t } from "@/lib/i18n/en";
import { seriesPath } from "@/lib/url";
import type { Series } from "@/lib/types";

interface NewSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSeriesDialog({ open, onOpenChange }: NewSeriesDialogProps) {
  const router = useRouter();

  function handleSuccess(series: Series) {
    onOpenChange(false);
    router.push(seriesPath(series));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.series.createTitle}</DialogTitle>
        </DialogHeader>
        <SeriesForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
