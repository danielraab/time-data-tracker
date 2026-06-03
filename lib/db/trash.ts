import { getDb } from "./pouch";
import { listAllEntries } from "./entries-repo";
import type { Entry, Series } from "@/lib/types";

export const PURGE_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns true if the item has been soft-deleted for longer than the retention window.
 * Pure helper — exported for unit tests.
 */
export function isPurgeEligible(
  deletedAt: string,
  now = new Date().toISOString(),
): boolean {
  return new Date(now).getTime() - new Date(deletedAt).getTime() > PURGE_RETENTION_DAYS * MS_PER_DAY;
}

/**
 * Returns how many whole days ago the item was deleted.
 * Pure helper — exported for unit tests.
 */
export function getDeletionAgeDays(
  deletedAt: string,
  now = new Date().toISOString(),
): number {
  return Math.floor(
    (new Date(now).getTime() - new Date(deletedAt).getTime()) / MS_PER_DAY,
  );
}

/**
 * Returns true if currentUserId is allowed to destructively delete/purge the doc.
 * A null ownerId means the doc only exists locally; anyone can purge it.
 * Pure helper — exported for unit tests.
 */
export function isOwner(
  ownerId: string | null,
  currentUserId: string | null,
): boolean {
  if (ownerId === null) return true;
  return ownerId === currentUserId;
}

/** Returns all soft-deleted series, newest-deletion-first. */
export async function listDeletedSeries(): Promise<Series[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "series" } });
  return (res.docs as Series[])
    .filter((s) => !!s.deletedAt)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
}

/** Returns all soft-deleted entries, newest-deletion-first. */
export async function listDeletedEntries(): Promise<Entry[]> {
  return (await listAllEntries())
    .filter((e) => !!e.deletedAt)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
}

export interface TrashGroup {
  series: Series;
  /** Soft-deleted entries belonging to this series. */
  entries: Entry[];
}

/**
 * Groups soft-deleted series with their child entries.
 * - seriesGroups: each deleted series with its deleted child entries (cascade)
 * - standaloneEntries: deleted entries whose parent series is still active
 * Pure helper — exported for unit tests.
 */
export async function groupTrashItems(): Promise<{
  seriesGroups: TrashGroup[];
  standaloneEntries: Entry[];
}> {
  const [deletedSeries, deletedEntries] = await Promise.all([
    listDeletedSeries(),
    listDeletedEntries(),
  ]);

  const deletedSeriesIds = new Set(deletedSeries.map((s) => s._id));

  const seriesGroups: TrashGroup[] = deletedSeries.map((series) => ({
    series,
    entries: deletedEntries.filter((e) => e.seriesId === series._id),
  }));

  const standaloneEntries = deletedEntries.filter(
    (e) => !deletedSeriesIds.has(e.seriesId),
  );

  return { seriesGroups, standaloneEntries };
}
