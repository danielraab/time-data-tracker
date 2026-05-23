import type { TidatraDoc } from "@/lib/types";

let dbPromise: Promise<PouchDB.Database<TidatraDoc>> | null = null;

/**
 * Returns (a promise for) the singleton local PouchDB instance. The
 * browser-only `pouchdb-browser` module is loaded via dynamic import so it is
 * never evaluated on the server (it references `self`, undefined in Node).
 *
 * The injected `dbPromise` check comes first so tests can swap in an
 * in-memory database via `_setDbForTests` without touching `window`.
 */
export function getDb(): Promise<PouchDB.Database<TidatraDoc>> {
  if (dbPromise) return dbPromise;
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("PouchDB is only available in the browser."),
    );
  }
  dbPromise = (async () => {
    const [{ default: PouchDB }, { default: find }] = await Promise.all([
      import("pouchdb-browser"),
      import("pouchdb-find"),
    ]);
    PouchDB.plugin(find);
    const db = new PouchDB<TidatraDoc>("tidatra");
    await db.createIndex({ index: { fields: ["type"] } });
    await db.createIndex({ index: { fields: ["type", "seriesId"] } });
    return db;
  })();
  return dbPromise;
}

/** Test-only hook: inject a pre-built database (e.g. an in-memory one). */
export function _setDbForTests(
  db: PouchDB.Database<TidatraDoc> | null,
): void {
  dbPromise = db ? Promise.resolve(db) : null;
}
