"use client";

import { use } from "react";
import { SeriesDetail } from "@/components/series/series-detail";
import { urlIdToSeriesId } from "@/lib/url";

export default function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SeriesDetail id={urlIdToSeriesId(id)} />;
}
