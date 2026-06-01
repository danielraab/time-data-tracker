import "server-only";
import type { TidatraDoc } from "@/lib/types";

const BASE = (process.env.COUCHDB_URL ?? "http://localhost:5984").replace(
  /\/$/,
  "",
);
const COUCH_USER = process.env.COUCHDB_USER ?? "admin";
const COUCH_PASS = process.env.COUCHDB_PASSWORD ?? "password";
const AUTH_HEADER = `Basic ${Buffer.from(`${COUCH_USER}:${COUCH_PASS}`).toString("base64")}`;

/**
 * Returns the per-user CouchDB database name.
 * Pure helper — exported for unit tests.
 */
export function userDbName(userId: string): string {
  // CouchDB db names must be lowercase, start with a letter, contain [a-z0-9_$()+/-]
  const sanitized = userId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `tidatra_${sanitized}`;
}

async function couchFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH_HEADER,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

/** Creates the CouchDB system databases required on first startup. */
export async function ensureSystemDbs(): Promise<void> {
  const systemDbs = ["_users", "_replicator", "_global_changes"];
  await Promise.all(
    systemDbs.map(async (db) => {
      const res = await couchFetch(`/${db}`, { method: "PUT" });
      // 201 = created, 412 = already exists — both are fine
      if (res.status !== 201 && res.status !== 412) {
        const body = await res.text();
        throw new Error(
          `Failed to create CouchDB system database '${db}': ${res.status} ${body}`,
        );
      }
    }),
  );
}

/** Creates the per-user CouchDB database if it does not yet exist. */
export async function ensureUserDb(userId: string): Promise<void> {
  const name = userDbName(userId);
  const res = await couchFetch(`/${name}`, { method: "PUT" });
  // 201 = created, 412 = already exists — both are fine
  if (res.status !== 201 && res.status !== 412) {
    const body = await res.text();
    throw new Error(
      `Failed to create CouchDB database '${name}': ${res.status} ${body}`,
    );
  }
}

/**
 * Returns docs changed since the given CouchDB sequence (`"0"` or `""` = all).
 * Deleted docs and internal design docs are excluded;
 * only type `"series"` and `"entry"` are returned with `_rev` stripped.
 */
export async function getChangesSince(
  userId: string,
  since: string,
): Promise<{ docs: TidatraDoc[]; lastSeq: string }> {
  const name = userDbName(userId);
  const seq = since || "0";
  const url = `/${name}/_changes?include_docs=true&since=${encodeURIComponent(seq)}`;
  const res = await couchFetch(url);

  if (!res.ok) {
    if (res.status === 404) return { docs: [], lastSeq: "0" };
    const body = await res.text();
    throw new Error(`CouchDB _changes failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    results: Array<{
      id: string;
      deleted?: boolean;
      doc: TidatraDoc & { _rev?: string; _deleted?: boolean };
    }>;
    last_seq: string | number;
  };

  const docs: TidatraDoc[] = data.results
    .filter(
      (r) =>
        r.doc &&
        !r.deleted &&
        !r.doc._deleted &&
        (r.doc.type === "series" || r.doc.type === "entry"),
    )
    .map(({ doc }) => {
      // Strip CouchDB _rev so the client won't confuse it with PouchDB _rev
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _rev: _, ...rest } = doc;
      return rest as TidatraDoc;
    });

  return { docs, lastSeq: String(data.last_seq) };
}

/**
 * Writes docs to the user's CouchDB using last-write-wins on `updatedAt`.
 * Existing docs with a newer or equal `updatedAt` are skipped.
 */
export async function putDocs(
  userId: string,
  docs: TidatraDoc[],
): Promise<{ accepted: number; skipped: number }> {
  if (docs.length === 0) return { accepted: 0, skipped: 0 };

  const name = userDbName(userId);
  const ids = docs.map((d) => d._id);
  const existingMap = await fetchExistingRevs(name, ids);

  const toWrite: Array<TidatraDoc & { _rev?: string }> = [];
  let skipped = 0;

  for (const incoming of docs) {
    const existing = existingMap.get(incoming._id);
    if (existing && existing.updatedAt >= incoming.updatedAt) {
      skipped++;
      continue;
    }
    toWrite.push({ ...incoming, _rev: existing?._rev });
  }

  if (toWrite.length > 0) {
    const res = await couchFetch(`/${name}/_bulk_docs`, {
      method: "POST",
      body: JSON.stringify({ docs: toWrite }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`CouchDB _bulk_docs failed: ${res.status} ${body}`);
    }
  }

  return { accepted: toWrite.length, skipped };
}

/**
 * Hard-deletes a list of docs from the user's CouchDB database using _bulk_docs.
 * Docs that don't exist or are already deleted are skipped.
 * Returns the number of docs actually deleted.
 */
export async function deleteDocsByIds(
  userId: string,
  docIds: string[],
): Promise<number> {
  if (docIds.length === 0) return 0;
  const name = userDbName(userId);
  const existingMap = await fetchExistingRevs(name, docIds);
  const toDelete = docIds
    .filter((id) => existingMap.has(id))
    .map((id) => ({
      _id: id,
      _rev: existingMap.get(id)!._rev,
      _deleted: true,
    }));
  if (toDelete.length === 0) return 0;
  const res = await couchFetch(`/${name}/_bulk_docs`, {
    method: "POST",
    body: JSON.stringify({ docs: toDelete }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CouchDB _bulk_docs (delete) failed: ${res.status} ${body}`);
  }
  return toDelete.length;
}

async function fetchExistingRevs(
  name: string,
  ids: string[],
): Promise<Map<string, { _rev: string; updatedAt: string }>> {
  if (ids.length === 0) return new Map();

  const res = await couchFetch(`/${name}/_all_docs?include_docs=true`, {
    method: "POST",
    body: JSON.stringify({ keys: ids }),
  });

  if (!res.ok) {
    if (res.status === 404) return new Map();
    const body = await res.text();
    throw new Error(`CouchDB _all_docs failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    rows: Array<{
      id: string;
      value?: { deleted?: boolean };
      doc?: TidatraDoc & { _rev: string };
    }>;
  };

  const map = new Map<string, { _rev: string; updatedAt: string }>();
  for (const row of data.rows) {
    if (row.doc && !row.value?.deleted) {
      map.set(row.id, { _rev: row.doc._rev, updatedAt: row.doc.updatedAt });
    }
  }
  return map;
}
