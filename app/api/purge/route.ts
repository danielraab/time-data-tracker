import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { deleteDocsByIds, ensureUserDb } from "@/lib/couch";

async function requireUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/**
 * POST /api/purge
 *
 * Hard-deletes the given doc IDs from the authenticated user's CouchDB database.
 * Used by the automatic purge flush after sync to remove stale soft-deleted docs.
 *
 * Request body:  `{ docIds: string[] }`
 * Response:      `{ deleted: number }`
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let docIds: string[];
  try {
    const body = (await req.json()) as { docIds: unknown };
    if (!Array.isArray(body.docIds)) throw new Error("docIds must be an array");
    docIds = body.docIds as string[];
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    await ensureUserDb(userId);
    const deleted = await deleteDocsByIds(userId, docIds);
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("[purge POST]", err);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
