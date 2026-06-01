import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { ensureUserDb, getChangesSince } from "@/lib/couch";
import { isOverrun, openStarts } from "@/lib/spans";
import type { Entry, Series } from "@/lib/types";

async function requireUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export interface OverrunItem {
  seriesId: string;
  seriesTitle: string;
  startEntryId: string;
  elapsedMinutes: number;
}

/**
 * GET /api/notify-overrun
 *
 * Returns JSON array of open durations that exceed their series `maxDurationMinutes`.
 * Used by the service worker to show background notifications.
 *
 * Response: `OverrunItem[]`
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureUserDb(userId);
    const { docs } = await getChangesSince(userId, "0");

    const seriesMap = new Map<string, Series>();
    const entriesBySeries = new Map<string, Entry[]>();

    for (const doc of docs) {
      if (doc.type === "series" && !doc.deletedAt) {
        seriesMap.set(doc._id, doc as Series);
      } else if (doc.type === "entry" && !doc.deletedAt) {
        const entry = doc as Entry;
        const list = entriesBySeries.get(entry.seriesId) ?? [];
        list.push(entry);
        entriesBySeries.set(entry.seriesId, list);
      }
    }

    const nowMs = Date.now();
    const result: OverrunItem[] = [];

    for (const [seriesId, series] of seriesMap) {
      if (series.maxDurationMinutes == null) continue;
      const entries = entriesBySeries.get(seriesId) ?? [];
      for (const start of openStarts(entries)) {
        if (!isOverrun(start, null, series.maxDurationMinutes, nowMs)) continue;
        const elapsedMinutes = Math.floor(
          (nowMs - new Date(start.timestamp).getTime()) / 60_000,
        );
        result.push({
          seriesId,
          seriesTitle: series.title,
          startEntryId: start._id,
          elapsedMinutes,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[notify-overrun GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
