import { format, formatDistanceStrict } from "date-fns";

/** Long, locale-friendly day label, e.g. "Saturday, May 23". */
export function formatDayLabel(date: Date): string {
  return format(date, "EEEE, MMM d");
}

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
export function formatDurationBetween(
  startIso: string,
  endIso: string,
): string {
  return formatDistanceStrict(new Date(endIso), new Date(startIso));
}

/** Precise duration, e.g. "2h 15m 34s" or "5m 02s" or "48s". */
export function formatDurationDetailed(
  startIso: string,
  endIso: string,
): string {
  const diffMs = Math.abs(
    new Date(endIso).getTime() - new Date(startIso).getTime(),
  );
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}h ${mm}m ${ss}s`;
  if (minutes > 0) return `${minutes}m ${ss}s`;
  return `${seconds}s`;
}

/** ISO string -> value for an <input type="datetime-local">. */
export function toDateTimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** <input type="datetime-local"> value -> ISO string. */
export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}
