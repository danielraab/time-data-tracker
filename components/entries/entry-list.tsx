"use client";

import { useMemo } from "react";
import { isOpenSpanEntry } from "@/lib/spans";
import { t } from "@/lib/i18n/en";
import type { Entry } from "@/lib/types";
import { EntryItem } from "./entry-item";

interface EntryListProps {
  entries: Entry[];
}

export function EntryList({ entries }: EntryListProps) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [entries],
  );

  const { startById, endByStartId } = useMemo(() => {
    const startById = new Map<string, Entry>();
    const endByStartId = new Map<string, Entry>();
    for (const entry of entries) {
      if (entry.entryType === "span_start") {
        startById.set(entry._id, entry);
      } else if (entry.entryType === "span_end" && entry.startEntryId) {
        endByStartId.set(entry.startEntryId, entry);
      }
    }
    return { startById, endByStartId };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t.entries.empty}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((entry) => {
        const pairedEnd =
          entry.entryType === "span_start"
            ? (endByStartId.get(entry._id) ?? null)
            : null;
        const pairedStart =
          entry.entryType === "span_end" && entry.startEntryId
            ? (startById.get(entry.startEntryId) ?? null)
            : null;
        return (
          <EntryItem
            key={entry._id}
            entry={entry}
            pairedEnd={pairedEnd}
            pairedStart={pairedStart}
            isOpen={isOpenSpanEntry(entry, entries)}
          />
        );
      })}
    </ul>
  );
}
