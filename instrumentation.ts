/**
 * Next.js instrumentation hook — runs once at server startup (Node.js runtime
 * only). We use it to ensure the better-auth SQLite schema is up-to-date before
 * the app accepts requests.
 */
export async function register() {
  const { auth } = await import("./lib/auth");
  const ctx = await auth.$context;
  await ctx.runMigrations();
}
