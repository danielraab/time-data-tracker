import type { Series } from "./types";

const SERIES_PREFIX = "series:";

/**
 * Returns the URL slug for a series. The PouchDB `_id` is prefixed with
 * `series:` for organization, but the colon is awkward in URL paths — so the
 * URL only ever carries the bare uuid.
 */
export function seriesUrlId(series: Series | string): string {
  const id = typeof series === "string" ? series : series._id;
  return id.startsWith(SERIES_PREFIX) ? id.slice(SERIES_PREFIX.length) : id;
}

/**
 * Converts a URL `[id]` segment back to the PouchDB `_id`. Tolerates the
 * already-prefixed form so it stays correct even if a caller passes the full
 * id by mistake.
 */
export function urlIdToSeriesId(urlId: string): string {
  return urlId.startsWith(SERIES_PREFIX) ? urlId : `${SERIES_PREFIX}${urlId}`;
}

/** Canonical detail-page path for a series. */
export function seriesPath(series: Series | string): string {
  return `/series/${seriesUrlId(series)}`;
}
