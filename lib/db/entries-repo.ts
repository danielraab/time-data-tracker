import { getDb } from "./pouch";
import type { Entry, EntryInput } from "@/lib/types";

const nowIso = () => new Date().toISOString();

export async function listEntries(seriesId: string): Promise<Entry[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "entry", seriesId } });
  return (res.docs as Entry[]).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
}

export async function listAllEntries(): Promise<Entry[]> {
  const db = await getDb();
  const res = await db.find({ selector: { type: "entry" } });
  return res.docs as Entry[];
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

export type EntryPatch = Partial<
  Pick<Entry, "timestamp" | "label" | "value" | "gps">
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
  await db.remove(await db.get(id));
}
