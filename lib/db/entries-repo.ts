import { getDb } from "./pouch";
import type { Entry, EntryInput } from "@/lib/types";

const nowIso = () => new Date().toISOString();

// All entry _ids share the "entry:" prefix. Using allDocs with a key range
// avoids the pouchdb-find mango index, which can silently miss documents whose
// type/seriesId fields were never mutated (index not re-emitted on update).
// allDocs uses PouchDB's built-in B-tree index and is always consistent.
async function allEntryDocs(db: PouchDB.Database): Promise<Entry[]> {
  const res = await db.allDocs<Entry>({
    include_docs: true,
    startkey: "entry:",
    endkey: "entry:￿",
  });
  return res.rows.map((r) => r.doc as Entry).filter(Boolean);
}

export async function listEntries(seriesId: string): Promise<Entry[]> {
  const db = await getDb();
  return (await allEntryDocs(db))
    .filter((e) => e.seriesId === seriesId && !e.deletedAt)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Returns all entries including soft-deleted ones (used by sync). */
export async function listAllEntries(): Promise<Entry[]> {
  const db = await getDb();
  return allEntryDocs(db);
}

/** Returns all non-deleted entries across every series (used by the dashboard). */
export async function listAllActiveEntries(): Promise<Entry[]> {
  const db = await getDb();
  return (await allEntryDocs(db)).filter((e) => !e.deletedAt);
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const db = await getDb();
  const ts = nowIso();
  const label = input.label?.trim();
  const doc: Entry = {
    _id: `entry:${crypto.randomUUID()}`,
    type: "entry",
    seriesId: input.seriesId,
    entryType: input.entryType,
    timestamp: input.timestamp,
    createdAt: ts,
    updatedAt: ts,
    ...(label && { label }),
    ...(input.value !== undefined && { value: input.value }),
    ...(input.gps && { gps: input.gps }),
    ...(input.startEntryId && { startEntryId: input.startEntryId }),
  };
  const res = await db.put(doc);
  return { ...doc, _rev: res.rev };
}

/** A partial update for an entry. Passing `startEntryId: undefined` unlinks
 *  a span_end from its span_start. */
export type EntryPatch = Partial<
  Pick<Entry, "timestamp" | "label" | "value" | "gps" | "startEntryId">
>;

export async function updateEntry(
  id: string,
  patch: EntryPatch,
): Promise<Entry> {
  const db = await getDb();
  const current = (await db.get(id)) as Entry;
  const updated: Entry = { ...current, ...patch, updatedAt: nowIso() };
  const res = await db.put(updated);
  return { ...updated, _rev: res.rev };
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  const doc = await db.get(id);
  const now = nowIso();
  await db.put({ ...doc, deletedAt: now, updatedAt: now });
}

/** Clears deletedAt on a soft-deleted entry, moving it back into active views. */
export async function restoreEntry(id: string): Promise<Entry> {
  const db = await getDb();
  const doc = (await db.get(id)) as Entry;
  const now = nowIso();
  const { deletedAt: _removed, ...rest } = doc;
  void _removed;
  await db.put({ ...rest, updatedAt: now });
  return (await db.get(id)) as Entry;
}

/** Permanently hard-deletes a single entry from local PouchDB. */
export async function purgeEntry(id: string): Promise<void> {
  const db = await getDb();
  const doc = await db.get(id);
  await db.remove(doc._id, doc._rev!);
}
