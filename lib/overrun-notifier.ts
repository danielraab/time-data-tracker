import { isOverrun, openStarts } from "./spans";
import { t } from "./i18n/en";
import type { Entry, Series } from "./types";

function storageKey(seriesId: string, startEntryId: string): string {
  return `overrun:${seriesId}:${startEntryId}`;
}

/**
 * Checks all open spans in `entries` for the given `series`. For each open
 * span that exceeds `series.maxDurationMinutes`, fires a browser notification
 * once (deduplication via localStorage).
 *
 * No-ops when `series.maxDurationMinutes` is not set, or when
 * `Notification.permission` is not `"granted"`.
 */
export function checkOverruns(
  series: Series,
  entries: Entry[],
  nowMs: number,
): void {
  if (series.maxDurationMinutes == null) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const maxMinutes = series.maxDurationMinutes;
  for (const start of openStarts(entries)) {
    if (!isOverrun(start, null, maxMinutes, nowMs)) continue;
    const key = storageKey(series._id, start._id);
    if (localStorage.getItem(key) !== null) continue;
    const elapsed = Math.floor(
      (nowMs - new Date(start.timestamp).getTime()) / 60_000,
    );
    new Notification(t.notifications.overrunTitle(series.title), {
      body: t.notifications.overrunBody(elapsed, maxMinutes),
      tag: key,
    });
    localStorage.setItem(key, "1");
  }
}

/**
 * Clears the deduplication flag for a given open span so that a future
 * overrun on the same span can trigger a new notification.
 */
export function clearOverrunFlag(seriesId: string, startEntryId: string): void {
  localStorage.removeItem(storageKey(seriesId, startEntryId));
}
