import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { ensureUserDb, getDocsByIds } from "@/lib/couch";

async function requireUserId(): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/**
 * POST /api/maintenance/docs
 *
 * Returns specific docs from the authenticated user's CouchDB database by ID.
 * Used by the maintenance page to fetch the server copy of a doc for comparison.
 *
 * Request body:  `{ ids: string[] }`
 * Response:      `{ docs: TidatraDoc[] }`
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ids: string[];
  try {
    const body = (await req.json()) as { ids: unknown };
    if (!Array.isArray(body.ids)) throw new Error("ids must be an array");
    ids = body.ids as string[];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureUserDb(userId);
    const docs = await getDocsByIds(userId, ids);
    return NextResponse.json({ docs });
  } catch (err) {
    console.error("[maintenance/docs POST]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
