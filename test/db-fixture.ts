/**
 * Test helper that gives each test a fresh in-memory PouchDB and wires it
 * into `lib/db/pouch` via the `_setDbForTests` hook. Repos and hooks then
 * use this instance unchanged — no mocking needed.
 */
import PouchDB from "pouchdb";
import memoryAdapter from "pouchdb-adapter-memory";
import findPlugin from "pouchdb-find";
import { _setDbForTests } from "@/lib/db/pouch";
import type { TidatraDoc } from "@/lib/types";

let pluginsRegistered = false;
function registerPlugins() {
  if (pluginsRegistered) return;
  PouchDB.plugin(memoryAdapter);
  PouchDB.plugin(findPlugin);
  pluginsRegistered = true;
}

let counter = 0;
let current: PouchDB.Database<TidatraDoc> | null = null;

export async function createTestDb(): Promise<PouchDB.Database<TidatraDoc>> {
  registerPlugins();
  const db = new PouchDB<TidatraDoc>(`tidatra-test-${++counter}`, {
    adapter: "memory",
  });
  await db.createIndex({ index: { fields: ["type"] } });
  await db.createIndex({ index: { fields: ["type", "seriesId"] } });
  _setDbForTests(db);
  current = db;
  return db;
}

export async function destroyTestDb(): Promise<void> {
  if (current) {
    await current.destroy();
    current = null;
  }
  _setDbForTests(null);
}
