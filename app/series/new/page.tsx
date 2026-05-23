"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeriesForm } from "@/components/series/series-form";
import { t } from "@/lib/i18n/en";

export default function NewSeriesPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft className="size-4" />
          {t.common.back}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.series.createTitle}
      </h1>
      <SeriesForm />
    </div>
  );
}
