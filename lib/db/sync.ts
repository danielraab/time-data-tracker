"use client";

import { getDb } from "./pouch";
import { listSeries } from "./series-repo";
import { listAllEntries } from "./entries-repo";
import type { TidatraDoc, Series } from "@/lib/types";

/** Persisted sync state stored as an internal doc in the local PouchDB. */
interface SyncCheckpointDoc {
  _id: "sync:checkpoint";
  _rev?: string;
  type: "sync_checkpoint";
  userId: string;
  /** ISO timestamp — determines which local docs need pushing on next sync. */
  lastSync: string;
  /** CouchDB last_seq — used for efficient incremental pull. */
  lastSeq: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/**
 * Returns `true` if `incoming` should replace `existing` (last-write-wins).
 * Pure helper — exported for unit tests.
 */
export function lastWriteWins(
  incoming: { updatedAt: string },
  existing: { updatedAt: string } | undefined,
): boolean {
  if (!existing) return true;
  return incoming.updatedAt > existing.updatedAt;
}

async function loadCheckpoint(): Promise<SyncCheckpointDoc | null> {
  const db = await getDb();
  try {
    return (await db.get("sync:checkpoint")) as unknown as SyncCheckpointDoc;
  } catch {
    return null;
  }
}

async function saveCheckpoint(
  userId: string,
  lastSync: string,
  lastSeq: string,
  existingRev?: string,
): Promise<void> {
  const db = await getDb();
  const doc: SyncCheckpointDoc = {
    _id: "sync:checkpoint",
    _rev: existingRev,
    type: "sync_checkpoint",
    userId,
    lastSync,
    lastSeq,
  };
  await db.put(doc as unknown as TidatraDoc);
}

/**
 * Assigns `ownerId` to all local Series docs that still have `ownerId: null`.
 * This migrates guest data to a real account on first login.
 * Pure helper — exported for unit tests.
 */
export async function claimLocalSeries(userId: string): Promise<void> {
  const db = await getDb();
  const series = await listSeries();
  const unclaimed = series.filter((s) => s.ownerId === null);
  if (unclaimed.length === 0) return;

  const now = new Date().toISOString();
  const claimed: Series[] = unclaimed.map((s) => ({
    ...s,
    ownerId: userId,
    updatedAt: now,
  }));
  await db.bulkDocs(claimed as TidatraDoc[]);
}

/**
 * Merges incoming docs from the server into the local PouchDB using LWW.
 * Returns the number of docs actually written.
 * Pure helper — exported for unit tests.
 */
export async function applyPulledDocs(
  db: PouchDB.Database<TidatraDoc>,
  docs: TidatraDoc[],
): Promise<number> {
  if (docs.length === 0) return 0;

  const toWrite: TidatraDoc[] = [];

  for (const incoming of docs) {
    let existingRev: string | undefined;
    try {
      const existing = (await db.get(incoming._id)) as TidatraDoc;
      if (!lastWriteWins(incoming, existing)) continue;
      existingRev = existing._rev;
    } catch {
      // Doc doesn't exist locally — will be inserted without a _rev
    }
    toWrite.push({ ...incoming, _rev: existingRev });
  }

  if (toWrite.length === 0) return 0;
  await db.bulkDocs(toWrite as TidatraDoc[]);
  return toWrite.length;
}

/**
 * Runs a full push-then-pull sync cycle for the given authenticated user.
 *
 * - Assigns `ownerId` to any still-unclaimed local series (guest → account
 *   migration).
 * - Pushes docs changed since the last sync to the server (LWW).
 * - Pulls all server changes since the last checkpoint and applies them locally
 *   (LWW).
 * - Persists an updated checkpoint on success.
 *
 * Throws on network / server errors so the caller can surface them in the UI.
 */
export async function runSync(userId: string): Promise<SyncResult> {
  const checkpoint = await loadCheckpoint();

  // Reset checkpoint when a different user signs in
  const lastSync = checkpoint?.userId === userId ? checkpoint.lastSync : "";
  const lastSeq = checkpoint?.userId === userId ? checkpoint.lastSeq : "0";

  // 1. Claim any still-unclaimed local series
  await claimLocalSeries(userId);

  // 2. Gather local docs to push
  const [series, entries] = await Promise.all([listSeries(), listAllEntries()]);
  const allLocal: TidatraDoc[] = [...series, ...entries];
  const toPush = lastSync
    ? allLocal.filter((d) => d.updatedAt > lastSync)
    : allLocal;

  // 3. Push
  let pushed = 0;
  if (toPush.length > 0) {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docs: toPush }),
    });
    if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);
    const data = (await res.json()) as { accepted: number };
    pushed = data.accepted ?? 0;
  }

  // 4. Pull changes from server
  const pullRes = await fetch(
    `/api/sync?since=${encodeURIComponent(lastSeq)}`,
  );
  if (!pullRes.ok) throw new Error(`Sync pull failed: ${pullRes.status}`);
  const pullData = (await pullRes.json()) as {
    docs: TidatraDoc[];
    lastSeq: string;
  };

  // 5. Apply pulled docs (LWW)
  const db = await getDb();
  const pulled = await applyPulledDocs(db, pullData.docs ?? []);

  // 6. Persist checkpoint
  const now = new Date().toISOString();
  await saveCheckpoint(userId, now, pullData.lastSeq ?? "0", checkpoint?._rev);

  return { pushed, pulled };
}
