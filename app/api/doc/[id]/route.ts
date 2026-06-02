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
 * GET /api/doc/[id]
 *
 * Fetches a single doc by ID for the authenticated user.
 * Returns the doc or 404 if not found.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await ensureUserDb(userId);
    const docs = await getDocsByIds(userId, [id]);
    if (docs.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(docs[0]);
  } catch (err) {
    console.error("[doc GET]", err);
    return NextResponse.json({ error: "Failed to fetch doc" }, { status: 500 });
  }
}
