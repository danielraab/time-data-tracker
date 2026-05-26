import { getDb } from "./pouch";
import type { Series, SeriesInput } from "@/lib/types";

const nowIso = () => new Date().toISOString();

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

/** Returns all non-archived series, newest-first. */
export async function listSeries(): Promise<Series[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "series" } });
  return (res.docs as Series[])
    .filter((s) => !s.isArchived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Returns all archived series, newest-first. */
export async function listArchivedSeries(): Promise<Series[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "series" } });
  return (res.docs as Series[])
    .filter((s) => !!s.isArchived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSeries(id: string): Promise<Series | null> {
  const db = await getDb();
  try {
    return (await db.get(id)) as Series;
  } catch {
    return null;
  }
}

/** Returns the series with isDefault === true, or null if none is set. */
export async function getDefaultSeries(): Promise<Series | null> {
  const all = await listSeries();
  return all.find((s) => s.isDefault) ?? null;
}

/**
 * Sets isDefault on the given series and clears it from all others.
 * Throws if the series does not exist.
 */
export async function setDefaultSeries(id: string): Promise<Series> {
  const db = await getDb();
  const all = await listSeries();
  const target = all.find((s) => s._id === id);
  if (!target) throw new Error(`Series not found: ${id}`);
  const now = nowIso();
  const toClear = all
    .filter((s) => s.isDefault && s._id !== id)
    .map((s): Series => ({ ...s, isDefault: false, updatedAt: now }));
  const updated: Series = { ...target, isDefault: true, updatedAt: now };
  await db.bulkDocs([...toClear, updated]);
  return (await db.get(id)) as Series;
}

export async function createSeries(input: SeriesInput): Promise<Series> {
  const db = await getDb();
  const ts = nowIso();
  const existing = await listSeries();
  // First series always becomes the default.
  const isDefault = existing.length === 0;
  const doc: Series = {
    _id: `series:${crypto.randomUUID()}`,
    type: "series",
    title: input.title.trim(),
    description: input.description.trim(),
    tags: normalizeTags(input.tags),
    ownerId: null,
    isDefault,
    createdAt: ts,
    updatedAt: ts,
  };
  const res = await db.put(doc);
  return { ...doc, _rev: res.rev };
}

export async function updateSeries(
  id: string,
  patch: Partial<SeriesInput>,
): Promise<Series> {
  const db = await getDb();
  const current = (await db.get(id)) as Series;
  const updated: Series = {
    ...current,
    ...(patch.title !== undefined && { title: patch.title.trim() }),
    ...(patch.description !== undefined && {
      description: patch.description.trim(),
    }),
    ...(patch.tags !== undefined && { tags: normalizeTags(patch.tags) }),
    updatedAt: nowIso(),
  };
  const res = await db.put(updated);
  return { ...updated, _rev: res.rev };
}

/**
 * Archives a series (read-only, hidden from the main overview). If it was the
 * default series, the default is promoted to the next non-archived series.
 */
export async function archiveSeries(id: string): Promise<Series> {
  const db = await getDb();
  const series = (await db.get(id)) as Series;
  const wasDefault = !!series.isDefault;
  const now = nowIso();
  await db.put({
    ...series,
    isArchived: true,
    isDefault: false,
    updatedAt: now,
  });
  if (wasDefault) {
    const remaining = await listSeries();
    if (remaining.length > 0) {
      await db.put({ ...remaining[0], isDefault: true, updatedAt: now });
    }
  }
  return (await db.get(id)) as Series;
}

/** Removes the archived flag from a series. */
export async function unarchiveSeries(id: string): Promise<Series> {
  const db = await getDb();
  const series = (await db.get(id)) as Series;
  const now = nowIso();
  await db.put({ ...series, isArchived: false, updatedAt: now });
  return (await db.get(id)) as Series;
}

/** Deletes a series and all of its entries. Promotes the next series to default
 *  if the deleted series was the default. */
export async function deleteSeries(id: string): Promise<void> {
  const db = await getDb();
  const series = (await db.get(id)) as Series;
  const wasDefault = !!series.isDefault;
  const entries = await db.find({ selector: { type: "entry", seriesId: id } });
  await db.bulkDocs([
    ...entries.docs.map((doc) => ({ ...doc, _deleted: true })),
    { ...series, _deleted: true },
  ]);
  if (wasDefault) {
    const remaining = await listSeries();
    if (remaining.length > 0) {
      // listSeries returns newest-first; pick the first as new default.
      const now = nowIso();
      await db.put({ ...remaining[0], isDefault: true, updatedAt: now });
    }
  }
}
