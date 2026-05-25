import { NextResponse } from "next/server";

/**
 * GET /api/config
 *
 * Returns public runtime configuration values that must not be baked into the
 * client bundle at build time (so they can be changed via container env vars
 * without a rebuild). Only expose values that are safe to send to any browser.
 */
export function GET() {
  return NextResponse.json({
    couchdbUrl: process.env.COUCHDB_URL ?? null,
  });
}
