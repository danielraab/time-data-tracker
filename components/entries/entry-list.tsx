"use client";

import { useMemo } from "react";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";
import { OpenStartItem } from "./open-start-item";
import { OrphanEndItem } from "./orphan-end-item";
import { PairedSpanItem } from "./paired-span-item";
import { PointItem } from "./point-item";

interface EntryListProps {
  entries: Entry[];
}

interface ResolvedSpans {
  endByStartId: Map<string, Entry>;
  pairedEndIds: Set<string>;
}

function resolveSpans(entries: Entry[]): ResolvedSpans {
  const startIds = new Set(
    entries.filter((e) => e.entryType === "span_start").map((e) => e._id),
  );
  const endByStartId = new Map<string, Entry>();
  const pairedEndIds = new Set<string>();
  for (const entry of entries) {
    if (
      entry.entryType === "span_end" &&
      entry.startEntryId &&
      startIds.has(entry.startEntryId)
    ) {
      endByStartId.set(entry.startEntryId, entry);
      pairedEndIds.add(entry._id);
    }
  }
  return { endByStartId, pairedEndIds };
}

export function EntryList({ entries }: EntryListProps) {
  const { endByStartId, pairedEndIds } = useMemo(
    () => resolveSpans(entries),
    [entries],
  );

  /**
   * For sorting: a paired span uses its START time as the row anchor so the
   * row doesn't jump around as you edit the end. Everything else uses its own
   * timestamp. Newest first.
   */
  const visible = useMemo(() => {
    return entries
      .filter(
        (entry) =>
          !(entry.entryType === "span_end" && pairedEndIds.has(entry._id)),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [entries, pairedEndIds]);

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t.entries.empty}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((entry) => {
        if (
          entry.entryType === "point_label" ||
          entry.entryType === "point_number"
        ) {
          return <PointItem key={entry._id} entry={entry} />;
        }
        if (entry.entryType === "span_start") {
          const end = endByStartId.get(entry._id);
          if (end) {
            return (
              <PairedSpanItem key={entry._id} start={entry} end={end} />
            );
          }
          return (
            <OpenStartItem
              key={entry._id}
              entry={entry}
              allEntries={entries}
            />
          );
        }
        // span_end (orphan — paired ends were filtered out above)
        return (
          <OrphanEndItem key={entry._id} entry={entry} allEntries={entries} />
        );
      })}
    </ul>
  );
}
