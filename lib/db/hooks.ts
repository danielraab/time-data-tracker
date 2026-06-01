"use client";

import { useEffect, useState } from "react";
import { getDb } from "./pouch";
import {
  getDefaultSeries,
  getSeries,
  listArchivedSeries,
  listSeries,
} from "./series-repo";
import { listAllEntries, listEntries } from "./entries-repo";
import { groupTrashItems, type TrashGroup } from "./trash";
import type { Entry, Series, TidatraDoc } from "@/lib/types";

/**
 * Subscribes a loader to the PouchDB changes feed so the result stays in sync
 * with the local database. `load` is re-run on every change.
 */
function useLive(
  load: (signal: { cancelled: boolean }) => Promise<void>,
  deps: unknown[],
): void {
  useEffect(() => {
    const signal = { cancelled: false };
    let changes: PouchDB.Core.Changes<TidatraDoc> | null = null;
    (async () => {
      await load(signal);
      if (signal.cancelled) return;
      const db = await getDb();
      if (signal.cancelled) return;
      changes = db.changes({ since: "now", live: true }).on("change", () => {
        void load(signal);
      });
    })();
    return () => {
      signal.cancelled = true;
      changes?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useSeriesList(): { series: Series[]; loading: boolean } {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  useLive(async (signal) => {
    const result = await listSeries();
    if (!signal.cancelled) {
      setSeries(result);
      setLoading(false);
    }
  }, []);
  return { series, loading };
}

export function useSeries(id: string): {
  series: Series | null;
  loading: boolean;
} {
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  useLive(
    async (signal) => {
      const result = await getSeries(id);
      if (!signal.cancelled) {
        setSeries(result);
        setLoading(false);
      }
    },
    [id],
  );
  return { series, loading };
}

export function useEntries(seriesId: string): {
  entries: Entry[];
  loading: boolean;
} {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  useLive(
    async (signal) => {
      const result = await listEntries(seriesId);
      if (!signal.cancelled) {
        setEntries(result);
        setLoading(false);
      }
    },
    [seriesId],
  );
  return { entries, loading };
}

/** All entries across every series — used by the dashboard for counts. */
export function useAllEntries(): { entries: Entry[]; loading: boolean } {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  useLive(async (signal) => {
    const result = await listAllEntries();
    if (!signal.cancelled) {
      setEntries(result);
      setLoading(false);
    }
  }, []);
  return { entries, loading };
}

/** Subscribes to the series that has isDefault === true. */
export function useDefaultSeries(): {
  series: Series | null;
  loading: boolean;
} {
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  useLive(async (signal) => {
    const result = await getDefaultSeries();
    if (!signal.cancelled) {
      setSeries(result);
      setLoading(false);
    }
  }, []);
  return { series, loading };
}

/** Subscribes to all archived series. */
export function useArchivedSeriesList(): {
  series: Series[];
  loading: boolean;
} {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  useLive(async (signal) => {
    const result = await listArchivedSeries();
    if (!signal.cancelled) {
      setSeries(result);
      setLoading(false);
    }
  }, []);
  return { series, loading };
}

/** Subscribes to the full trash state: grouped deleted series + standalone deleted entries. */
export function useTrashItems(): {
  seriesGroups: TrashGroup[];
  standaloneEntries: Entry[];
  loading: boolean;
} {
  const [seriesGroups, setSeriesGroups] = useState<TrashGroup[]>([]);
  const [standaloneEntries, setStandaloneEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  useLive(async (signal) => {
    const result = await groupTrashItems();
    if (!signal.cancelled) {
      setSeriesGroups(result.seriesGroups);
      setStandaloneEntries(result.standaloneEntries);
      setLoading(false);
    }
  }, []);
  return { seriesGroups, standaloneEntries, loading };
}

/** Looks up all series (including archived, excluding deleted) by id. */
export function useAllSeriesMap(): Map<string, Series> {
  const [map, setMap] = useState<Map<string, Series>>(new Map());
  useLive(async (signal) => {
    const result = await listSeries();
    if (!signal.cancelled) setMap(new Map(result.map((s) => [s._id, s])));
  }, []);
  return map;
}
