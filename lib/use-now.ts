"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current wall-clock time (ms since epoch), refreshed at the given
 * interval. Returns `null` on the first render so that `Date.now()` is never
 * read during render (which would violate React 19 purity rules).
 */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const id = setInterval(update, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
