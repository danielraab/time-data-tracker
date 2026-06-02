import { getDb } from "./pouch";
import type { Entry, Series, TidatraDoc } from "@/lib/types";

/**
 * De-duplication of documents that were created independently on multiple
 * devices before sync existed. Because every doc gets a random `_id`
 * (`series:<uuid>` / `entry:<uuid>`), the "same" logical series or entry ends
 * up as two distinct documents once both devices sync to one account. Edits
 * and deletes then only ever touch one copy, so they appear not to sync.
 *
 * This module finds those duplicates and produces a plan to collapse each
 * group onto a single canonical doc. Applying the plan is non-destructive: the
 * extra copies are **soft-deleted** (recoverable from trash) and all references
 * are repointed to the canonical doc. Nothing is hard-deleted here.
 */

/**
 * Normalizes a string for logical comparison: trims, lowercases, collapses
 * internal whitespace. Pure helper — exported for unit tests.
 */
export function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Logical identity of a series, independent of its random `_id`. Two series
 * with the same normalized title + description + tag set are treated as the
 * same logical series. Pure helper — exported for unit tests.
 */
export function logicalSeriesKey(s: Series): string {
  const tags = [...s.tags].map(normalize).sort().join(",");
  return `${normalize(s.title)}|${normalize(s.description)}|${tags}`;
}

/**
 * Logical identity of an entry, independent of its random `_id`. Uses the
 * (canonical) series, timestamp, type, label and value — the fields that make
 * two entries "the same event". Pure helper — exported for unit tests.
 */
export function logicalEntryKey(e: Entry, seriesId = e.seriesId): string {
  return [
    seriesId,
    e.timestamp,
    e.entryType,
    normalize(e.label),
    e.value ?? "",
  ].join("|");
}

/**
 * Picks the canonical doc from a set of logical duplicates: the earliest
 * `createdAt` wins, tie-broken by the lexicographically smallest `_id` so the
 * choice is deterministic across devices. Pure helper — exported for unit tests.
 */
export function pickCanonical<T extends TidatraDoc>(docs: T[]): T {
  return [...docs].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a._id < b._id ? -1 : 1;
  })[0];
}

export interface DedupeGroup<T> {
  canonical: T;
  /** Logical duplicates to soft-delete and repoint references away from. */
  duplicates: T[];
}

export interface DedupePlan {
  seriesGroups: DedupeGroup<Series>[];
  entryGroups: DedupeGroup<Entry>[];
  /** Maps every duplicate series `_id` to the canonical series `_id`. */
  seriesIdRemap: Map<string, string>;
}

function groupBy<T extends TidatraDoc>(
  docs: T[],
  keyOf: (d: T) => string,
): DedupeGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const doc of docs) {
    const key = keyOf(doc);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(doc);
    else byKey.set(key, [doc]);
  }
  const groups: DedupeGroup<T>[] = [];
  for (const bucket of byKey.values()) {
    if (bucket.length < 2) continue; // not a duplicate
    const canonical = pickCanonical(bucket);
    groups.push({
      canonical,
      duplicates: bucket.filter((d) => d._id !== canonical._id),
    });
  }
  return groups;
}

/**
 * Builds a de-duplication plan from the current active (non-deleted) series and
 * entries. Series are grouped first; entries are then re-keyed onto their
 * canonical series before being grouped, so entries that differ only because
 * their parent series was duplicated are collapsed too.
 *
 * Pure helper — exported for unit tests. Does not touch the database.
 */
export function planDedupe(series: Series[], entries: Entry[]): DedupePlan {
  const activeSeries = series.filter((s) => !s.deletedAt);
  const activeEntries = entries.filter((e) => !e.deletedAt);

  const seriesGroups = groupBy(activeSeries, logicalSeriesKey);

  // duplicate series _id -> canonical series _id
  const seriesIdRemap = new Map<string, string>();
  for (const group of seriesGroups) {
    for (const dup of group.duplicates) {
      seriesIdRemap.set(dup._id, group.canonical._id);
    }
  }

  const canonicalSeriesId = (id: string) => seriesIdRemap.get(id) ?? id;

  const entryGroups = groupBy(activeEntries, (e) =>
    logicalEntryKey(e, canonicalSeriesId(e.seriesId)),
  );

  return { seriesGroups, entryGroups, seriesIdRemap };
}

export interface DedupeSummary {
  duplicateSeries: number;
  duplicateEntries: number;
  seriesGroupCount: number;
  entryGroupCount: number;
}

/** Human-readable counts for a dry-run. Pure helper — exported for unit tests. */
export function summarizePlan(plan: DedupePlan): DedupeSummary {
  return {
    seriesGroupCount: plan.seriesGroups.length,
    entryGroupCount: plan.entryGroups.length,
    duplicateSeries: plan.seriesGroups.reduce(
      (n, g) => n + g.duplicates.length,
      0,
    ),
    duplicateEntries: plan.entryGroups.reduce(
      (n, g) => n + g.duplicates.length,
      0,
    ),
  };
}

export interface DedupeResult extends DedupeSummary {
  /** Docs actually written (canonical updates + soft-deletes). */
  written: number;
}

/**
 * Applies a de-dup plan to the local database:
 *  1. Repoints every entry's `seriesId` from a duplicate series to its canonical.
 *  2. Repoints every entry's `startEntryId` from a duplicate entry to its canonical.
 *  3. Soft-deletes the duplicate series and entries (recoverable from trash).
 *
 * All writes go through one `bulkDocs`. Nothing is hard-deleted. Returns counts
 * for confirmation. Safe to call with an empty plan (no-op).
 */
export async function applyDedupe(plan: DedupePlan): Promise<DedupeResult> {
  const summary = summarizePlan(plan);
  const db = await getDb();
  const now = new Date().toISOString();

  // entry _id remap: duplicate entry -> canonical entry (for startEntryId refs)
  const entryIdRemap = new Map<string, string>();
  for (const group of plan.entryGroups) {
    for (const dup of group.duplicates) {
      entryIdRemap.set(dup._id, group.canonical._id);
    }
  }

  const duplicateSeriesIds = new Set(plan.seriesIdRemap.keys());
  const duplicateEntryIds = new Set(entryIdRemap.keys());

  // Re-read live docs so we write with current _revs.
  const all = await db.allDocs<TidatraDoc>({ include_docs: true });
  const writes: TidatraDoc[] = [];

  for (const row of all.rows) {
    const doc = row.doc;
    if (!doc) continue;

    if (doc.type === "series") {
      if (duplicateSeriesIds.has(doc._id) && !doc.deletedAt) {
        writes.push({ ...doc, deletedAt: now, updatedAt: now });
      }
      continue;
    }

    if (doc.type === "entry") {
      const isDuplicate = duplicateEntryIds.has(doc._id);
      const newSeriesId = plan.seriesIdRemap.get(doc.seriesId);
      const newStartId =
        doc.startEntryId && entryIdRemap.get(doc.startEntryId);

      if (isDuplicate) {
        if (!doc.deletedAt) {
          writes.push({ ...doc, deletedAt: now, updatedAt: now });
        }
        continue;
      }

      if (newSeriesId || newStartId) {
        writes.push({
          ...doc,
          ...(newSeriesId && { seriesId: newSeriesId }),
          ...(newStartId && { startEntryId: newStartId }),
          updatedAt: now,
        });
      }
    }
  }

  let written = 0;
  if (writes.length > 0) {
    const results = await db.bulkDocs(writes);
    written = results.filter((r) => "ok" in r && r.ok).length;
  }

  return { ...summary, written };
}

// ---------------------------------------------------------------------------
// Duplicate end-link detection & repair
// ---------------------------------------------------------------------------

/**
 * A span_start that has more than one span_end referencing it via `startEntryId`.
 * Only the chronologically earliest end is the legitimate pair; the rest must be
 * unlinked so they show as visible orphan ends rather than silently disappearing.
 * Pure helper — exported for unit tests.
 */
export interface DuplicateEndLinkGroup {
  start: Entry;
  /** All span_end entries pointing at this start, sorted earliest-first. */
  ends: Entry[];
  /** ends[0] — the one that will be kept linked. */
  keepEnd: Entry;
  /** ends[1…] — the ones that will have startEntryId cleared. */
  unlinkEnds: Entry[];
}

/**
 * Finds all span_starts that have more than one span_end claiming them via
 * `startEntryId`. Ignores soft-deleted entries.
 * Pure helper — exported for unit tests.
 */
export function findDuplicateEndLinks(entries: Entry[]): DuplicateEndLinkGroup[] {
  const active = entries.filter((e) => !e.deletedAt);
  const startById = new Map(
    active.filter((e) => e.entryType === "span_start").map((e) => [e._id, e]),
  );

  // Group span_ends by startEntryId.
  const endsByStartId = new Map<string, Entry[]>();
  for (const e of active) {
    if (e.entryType !== "span_end" || !e.startEntryId) continue;
    if (!startById.has(e.startEntryId)) continue;
    const bucket = endsByStartId.get(e.startEntryId);
    if (bucket) bucket.push(e);
    else endsByStartId.set(e.startEntryId, [e]);
  }

  const groups: DuplicateEndLinkGroup[] = [];
  for (const [startId, ends] of endsByStartId) {
    if (ends.length < 2) continue;
    const sorted = [...ends].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    groups.push({
      start: startById.get(startId)!,
      ends: sorted,
      keepEnd: sorted[0],
      unlinkEnds: sorted.slice(1),
    });
  }
  return groups;
}

/**
 * Applies the duplicate end-link repair: clears `startEntryId` on every extra
 * span_end so that only the earliest end remains paired with each span_start.
 * Unlinked ends become orphan ends (visible and manageable in the UI).
 * Returns the number of entries updated.
 */
export async function repairDuplicateEndLinks(
  groups: DuplicateEndLinkGroup[],
): Promise<number> {
  if (groups.length === 0) return 0;
  const db = await getDb();
  const now = new Date().toISOString();

  // Re-read live docs to get current _revs.
  const ids = groups.flatMap((g) => g.unlinkEnds.map((e) => e._id));
  const result = await db.allDocs<TidatraDoc>({ keys: ids, include_docs: true });
  const writes: TidatraDoc[] = [];
  for (const row of result.rows) {
    if ("error" in row) continue;
    const doc = row.doc as Entry | undefined;
    if (!doc || doc.deletedAt) continue;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { startEntryId: _removed, ...rest } = doc;
    writes.push({ ...rest, updatedAt: now } as TidatraDoc);
  }

  if (writes.length === 0) return 0;
  const results = await db.bulkDocs(writes);
  return results.filter((r) => "ok" in r && r.ok).length;
}

/**
 * Convenience dry-run: loads all local docs and returns the plan + summary
 * without writing anything. Intended to be called from the browser console or
 * a dev/settings action so the user can review before applying.
 */
export async function dryRunDedupe(): Promise<{
  plan: DedupePlan;
  summary: DedupeSummary;
  endLinkGroups: DuplicateEndLinkGroup[];
}> {
  const db = await getDb();
  const all = await db.allDocs<TidatraDoc>({ include_docs: true });
  const series: Series[] = [];
  const entries: Entry[] = [];
  for (const row of all.rows) {
    const doc = row.doc;
    if (doc?.type === "series") series.push(doc);
    else if (doc?.type === "entry") entries.push(doc);
  }
  const plan = planDedupe(series, entries);
  const endLinkGroups = findDuplicateEndLinks(entries);
  return { plan, summary: summarizePlan(plan), endLinkGroups };
}
