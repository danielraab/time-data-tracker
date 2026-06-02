"use client";

import { listSeries, listArchivedSeries } from "./series-repo";
import { listEntries } from "./entries-repo";
import { getDb } from "./pouch";
import { resetSyncLastPush } from "./sync";
import type { Series, Entry } from "@/lib/types";

export interface ExportFile {
  version: 1;
  exportedAt: string;
  series: Series[];
  entries: Entry[];
}

export interface ImportResult {
  seriesInserted: number;
  seriesUpdated: number;
  seriesSkipped: number;
  entriesInserted: number;
  entriesUpdated: number;
  entriesSkipped: number;
}

function stripRev<T extends { _rev?: string }>(doc: T): Omit<T, "_rev"> {
  const { _rev: _, ...rest } = doc;
  void _;
  return rest;
}

export async function exportData(seriesIds: string[]): Promise<ExportFile> {
  const idSet = new Set(seriesIds);
  const [active, archived] = await Promise.all([
    listSeries(),
    listArchivedSeries(),
  ]);
  const allSeries = [...active, ...archived].filter((s) => idSet.has(s._id));

  const entriesBySeriesPromises = allSeries.map((s) => listEntries(s._id));
  const entriesNested = await Promise.all(entriesBySeriesPromises);
  const entries = entriesNested.flat();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    series: allSeries.map(stripRev) as Series[],
    entries: entries.map(stripRev) as Entry[],
  };
}

async function upsertDoc(
  db: PouchDB.Database,
  doc: Series | Entry,
): Promise<"inserted" | "updated" | "skipped"> {
  try {
    const local = await db.get(doc._id);
    if (doc.updatedAt > (local as Series | Entry).updatedAt) {
      await db.put({ ...doc, _rev: local._rev });
      return "updated";
    }
    return "skipped";
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) {
      const { _rev: _, ...docWithoutRev } = doc as Series & { _rev?: string };
      void _;
      await db.put(docWithoutRev);
      return "inserted";
    }
    throw err;
  }
}

export async function importData(file: ExportFile): Promise<ImportResult> {
  const db = await getDb();
  const result: ImportResult = {
    seriesInserted: 0,
    seriesUpdated: 0,
    seriesSkipped: 0,
    entriesInserted: 0,
    entriesUpdated: 0,
    entriesSkipped: 0,
  };

  for (const s of file.series) {
    const outcome = await upsertDoc(db, s);
    if (outcome === "inserted") result.seriesInserted++;
    else if (outcome === "updated") result.seriesUpdated++;
    else result.seriesSkipped++;
  }

  for (const e of file.entries) {
    const outcome = await upsertDoc(db, e);
    if (outcome === "inserted") result.entriesInserted++;
    else if (outcome === "updated") result.entriesUpdated++;
    else result.entriesSkipped++;
  }

  // Imported docs carry historical updatedAt timestamps that predate the last
  // sync checkpoint, so they would be silently skipped by the incremental push
  // filter. Reset the checkpoint so the next sync does a full push.
  await resetSyncLastPush();

  return result;
}
