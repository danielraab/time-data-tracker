import { getDb } from "./pouch";
import type { Series, SeriesInput } from "@/lib/types";

const nowIso = () => new Date().toISOString();

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
}

export async function listSeries(): Promise<Series[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "series" } });
  return (res.docs as Series[]).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getSeries(id: string): Promise<Series | null> {
  const db = await getDb();
  try {
    return (await db.get(id)) as Series;
  } catch {
    return null;
  }
}

export async function createSeries(input: SeriesInput): Promise<Series> {
  const db = await getDb();
  const ts = nowIso();
  const doc: Series = {
    _id: `series:${crypto.randomUUID()}`,
    type: "series",
    title: input.title.trim(),
    description: input.description.trim(),
    tags: normalizeTags(input.tags),
    ownerId: null,
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

/** Deletes a series and all of its entries. */
export async function deleteSeries(id: string): Promise<void> {
  const db = await getDb();
  const series = await db.get(id);
  const entries = await db.find({ selector: { type: "entry", seriesId: id } });
  await db.bulkDocs([
    ...entries.docs.map((doc) => ({ ...doc, _deleted: true })),
    { ...series, _deleted: true },
  ]);
}
