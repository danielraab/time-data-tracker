import { format, formatDistanceStrict } from "date-fns";

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "PP · HH:mm");
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "PP");
}

export function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** Human-readable length of a duration, e.g. "2 hours". */
export function formatDurationBetween(startIso: string, endIso: string): string {
  return formatDistanceStrict(new Date(endIso), new Date(startIso));
}

/** ISO string -> value for an <input type="datetime-local">. */
export function toDateTimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** <input type="datetime-local"> value -> ISO string. */
export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}
