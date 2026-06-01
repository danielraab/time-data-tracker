export type EntryType =
  | "point_label"
  | "point_number"
  | "span_start"
  | "span_end";

export interface Gps {
  lat: number;
  lng: number;
  accuracy: number;
}

interface BaseDoc {
  _id: string;
  _rev?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the doc is soft-deleted; used to propagate deletions via sync. */
  deletedAt?: string;
}

/** A named collection of timestamped entries. */
export interface Series extends BaseDoc {
  type: "series";
  title: string;
  description: string;
  tags: string[];
  /** null while the series only exists locally; set once synced to an account. */
  ownerId: string | null;
  /** Exactly one series per local database should have this set to true. */
  isDefault?: boolean;
  /** Archived series are read-only and hidden from the main overview. */
  isArchived?: boolean;
}

/** A single timestamped record inside a series. */
export interface Entry extends BaseDoc {
  type: "entry";
  seriesId: string;
  entryType: EntryType;
  /** ISO 8601 timestamp the entry refers to. */
  timestamp: string;
  label?: string;
  value?: number;
  gps?: Gps;
  /** On a span_end: the _id of the span_start it closes. */
  startEntryId?: string;
}

export type TidatraDoc = Series | Entry;

export type SeriesInput = Pick<Series, "title" | "description" | "tags">;

export type EntryInput = Pick<Entry, "seriesId" | "entryType" | "timestamp"> &
  Partial<Pick<Entry, "label" | "value" | "gps" | "startEntryId">>;
