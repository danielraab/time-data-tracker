"use client";

import { QuickAdd } from "@/components/dashboard/quick-add";
import { SeriesList } from "@/components/dashboard/series-list";

export default function Home() {
  return (
    <div className="space-y-6">
      <QuickAdd />
      <SeriesList />
    </div>
  );
}
