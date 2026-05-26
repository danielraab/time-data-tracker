import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { ensureUserDb, getChangesSince, putDocs } from "@/lib/couch";
import type { TidatraDoc } from "@/lib/types";

async function requireUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/**
 * GET /api/sync?since=<CouchDB sequence>
 *
 * Pulls docs changed since the given CouchDB sequence for the authenticated
 * user.  Pass `since=0` (or omit) to get the full set on first sync.
 *
 * Response: `{ docs: TidatraDoc[], lastSeq: string }`
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = req.nextUrl.searchParams.get("since") ?? "0";

  try {
    await ensureUserDb(userId);
    const { docs, lastSeq } = await getChangesSince(userId, since);
    return NextResponse.json({ docs, lastSeq });
  } catch (err) {
    console.error("[sync GET]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

/**
 * POST /api/sync
 *
 * Pushes local doc changes to the server.  The server applies last-write-wins
 * on `updatedAt`: if the server copy is equal or newer, the incoming doc is
 * skipped.
 *
 * Request body:  `{ docs: TidatraDoc[] }`
 * Response:      `{ accepted: number, skipped: number }`
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let docs: TidatraDoc[];
  try {
    const body = (await req.json()) as { docs: unknown };
    if (!Array.isArray(body.docs)) throw new Error("docs must be an array");
    docs = body.docs as TidatraDoc[];
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    await ensureUserDb(userId);
    const result = await putDocs(userId, docs);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync POST]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
