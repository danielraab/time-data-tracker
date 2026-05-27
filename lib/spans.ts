import type { Entry } from "./types";

export interface SpanPair {
  start: Entry;
  /** null while the duration is still open. */
  end: Entry | null;
}

/** A span_start with no span_end referencing it. */
export function isOpenStart(entry: Entry, entries: Entry[]): boolean {
  if (entry.entryType !== "span_start") return false;
  return !entries.some(
    (e) => e.entryType === "span_end" && e.startEntryId === entry._id,
  );
}

/** A span_end that references no existing span_start. */
export function isOrphanEnd(entry: Entry, entries: Entry[]): boolean {
  if (entry.entryType !== "span_end") return false;
  return !entries.some(
    (e) => e.entryType === "span_start" && e._id === entry.startEntryId,
  );
}

/** True if the entry is a half of a duration that is missing its other half. */
export function isOpenSpanEntry(entry: Entry, entries: Entry[]): boolean {
  return isOpenStart(entry, entries) || isOrphanEnd(entry, entries);
}

/** True if the series has at least one unmatched duration start or end. */
export function hasOpenSpan(entries: Entry[]): boolean {
  return entries.some((e) => isOpenSpanEntry(e, entries));
}

/** span_start entries that still need to be closed. */
export function openStarts(entries: Entry[]): Entry[] {
  return entries.filter((e) => isOpenStart(e, entries));
}

/** span_end entries with no matching span_start. */
export function orphanEnds(entries: Entry[]): Entry[] {
  return entries.filter((e) => isOrphanEnd(e, entries));
}

/** Open starts whose timestamp is strictly before `beforeIso`. */
export function openStartsBefore(entries: Entry[], beforeIso: string): Entry[] {
  return openStarts(entries).filter((s) => s.timestamp < beforeIso);
}

/** Orphan ends whose timestamp is strictly after `afterIso`. */
export function orphanEndsAfter(entries: Entry[], afterIso: string): Entry[] {
  return orphanEnds(entries).filter((e) => e.timestamp > afterIso);
}

/** Pairs every span_start with its span_end (or null when still open). */
export function pairSpans(entries: Entry[]): SpanPair[] {
  return entries
    .filter((e) => e.entryType === "span_start")
    .map((start) => ({
      start,
      end:
        entries.find(
          (e) => e.entryType === "span_end" && e.startEntryId === start._id,
        ) ?? null,
    }));
}

/**
 * Returns the total duration in milliseconds of all spans that overlap the
 * given day window [dayStartMs, dayEndMs).
 *
 * Completed spans are clipped to the day bounds.
 * Open spans (no end entry) contribute from their start (clamped to dayStart)
 * up to `nowMs`, but only when `start.timestamp < nowMs`.
 *
 * Pure helper — exported for unit tests.
 */
export function sumDurationsForDay(
  entries: Entry[],
  dayStartMs: number,
  dayEndMs: number,
  nowMs: number,
): number {
  let total = 0;
  for (const { start, end } of pairSpans(entries)) {
    const startMs = new Date(start.timestamp).getTime();
    const endMs: number | null = end
      ? new Date(end.timestamp).getTime()
      : startMs < nowMs
        ? nowMs
        : null;
    if (endMs === null) continue;
    const clippedStart = Math.max(startMs, dayStartMs);
    const clippedEnd = Math.min(endMs, dayEndMs);
    if (clippedEnd > clippedStart) total += clippedEnd - clippedStart;
  }
  return total;
}
