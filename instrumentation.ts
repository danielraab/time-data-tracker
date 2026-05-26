/**
 * Next.js instrumentation hook — runs once at server startup (Node.js runtime
 * only). We use it to ensure the better-auth SQLite schema is up-to-date before
 * the app accepts requests.
 */
export async function register() {
  // Skip auth initialization during `next build`; it should only happen once the
  // runtime server starts handling requests.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const [{ getAuth }, { ensureSystemDbs }] = await Promise.all([
    import("./lib/auth"),
    import("./lib/couch"),
  ]);

  await Promise.all([
    getAuth().$context.then((ctx) => ctx.runMigrations()),
    ensureSystemDbs(),
  ]);
}
