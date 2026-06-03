"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Merge,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dryRunDedupe,
  applyDedupe,
  repairDuplicateEndLinks,
  type DedupePlan,
  type DuplicateEndLinkGroup,
} from "@/lib/db/dedupe";
import { getDb } from "@/lib/db/pouch";
import { useSyncContext } from "@/lib/db/sync-context";
import { useSession } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n/en";
import { forceDocToLocal, forceDocToServer } from "@/lib/db/sync";
import type { TidatraDoc } from "@/lib/types";

// ---------------------------------------------------------------------------
// Comparison doc row (both sides loaded)
// ---------------------------------------------------------------------------

type ComparisonStatus = "in-sync" | "diff" | "local-only" | "server-only";

interface ComparisonDocRowProps {
  id: string;
  local: TidatraDoc | null;
  server: TidatraDoc | null;
  onRefresh: () => void;
}

function getComparisonStatus(
  local: TidatraDoc | null,
  server: TidatraDoc | null,
): ComparisonStatus {
  if (local && server) {
    if (
      local.updatedAt !== server.updatedAt ||
      local.deletedAt !== server.deletedAt
    ) {
      return "diff";
    }

    //entry
    if ("timestamp" in local && "timestamp" in server) {
      return local.timestamp === server.timestamp &&
        local.label === server.label &&
        local.value === server.value &&
        JSON.stringify(local.gps) === JSON.stringify(server.gps) &&
        local.startEntryId === server.startEntryId
        ? "in-sync"
        : "diff";
    }

    //series
    if ("title" in local && "title" in server) {
      return local.title === server.title &&
        local.description === server.description &&
        JSON.stringify(local.tags) === JSON.stringify(server.tags) &&
        local.maxDurationMinutes === server.maxDurationMinutes &&
        local.isArchived === server.isArchived &&
        local.isDefault === server.isDefault
        ? "in-sync"
        : "diff";
    }
  }
  if (local) return "local-only";
  return "server-only";
}

function ComparisonDocRow({
  id,
  local,
  server,
  onRefresh,
}: ComparisonDocRowProps) {
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [forceLocalState, setForceLocalState] = useState<
    "idle" | "busy" | "done" | "error"
  >("idle");
  const [forceServerState, setForceServerState] = useState<
    "idle" | "busy" | "done" | "error"
  >("idle");
  const status = getComparisonStatus(local, server);
  const doc = local ?? server!;
  const deleted = doc && "deletedAt" in doc && !!doc.deletedAt;

  async function handleForceToLocal() {
    if (!window.confirm(t.maintenance.confirmForceToLocal)) return;
    setForceLocalState("busy");
    try {
      await forceDocToLocal(id);
      setForceLocalState("done");
      setTimeout(() => {
        setForceLocalState("idle");
        onRefresh();
      }, 1000);
    } catch {
      setForceLocalState("error");
    }
  }

  async function handleForceToServer() {
    if (!window.confirm(t.maintenance.confirmForceToServer)) return;
    setForceServerState("busy");
    try {
      await forceDocToServer(id);
      setForceServerState("done");
      setTimeout(() => {
        setForceServerState("idle");
        onRefresh();
      }, 1000);
    } catch {
      setForceServerState("error");
    }
  }

  const statusBadge = (() => {
    if (status === "in-sync") return null;
    if (status === "local-only")
      return (
        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          local only
        </span>
      );
    if (status === "server-only")
      return (
        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          server only
        </span>
      );
    if (status === "diff") {
      const isLocalNewer =
        local! && server! && local.updatedAt > server.updatedAt;
      return (
        <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800 dark:bg-orange-950 dark:text-orange-200">
          {isLocalNewer ? "local newer" : "server newer"}
        </span>
      );
    }
  })();

  return (
    <li className="rounded border text-xs">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          className="flex flex-1 items-start gap-2 text-left"
          onClick={() => setShowSideBySide((o) => !o)}
        >
          {showSideBySide ? (
            <ChevronDown className="mt-px size-3 shrink-0" />
          ) : (
            <ChevronRight className="mt-px size-3 shrink-0" />
          )}
          <span
            className={`flex-1 font-mono break-all ${deleted ? "text-muted-foreground line-through" : ""}`}
          >
            {id}
          </span>
          {deleted && (
            <span className="shrink-0 rounded bg-muted px-1 text-muted-foreground">
              deleted
            </span>
          )}
        </button>
        {"timestamp" in doc && (
          <span className="shrink-0 text-muted-foreground">
            {formatDateTime(doc.timestamp)}
          </span>
        )}
        {statusBadge}
      </div>

      {/* Side-by-side comparison */}
      {showSideBySide && (
        <>
          <div className="border-t grid grid-cols-2 divide-x">
            {/* Local side */}
            <div>
              <div className="bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                Local
              </div>
              {local ? (
                <pre className="overflow-x-auto bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
                  {JSON.stringify(local, null, 2)}
                </pre>
              ) : (
                <p className="px-3 py-2 text-muted-foreground italic">
                  Not in local DB
                </p>
              )}
            </div>

            {/* Server side */}
            <div>
              <div className="bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                Server
              </div>
              {server ? (
                <pre className="overflow-x-auto bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
                  {JSON.stringify(server, null, 2)}
                </pre>
              ) : (
                <p className="px-3 py-2 text-muted-foreground italic">
                  Not on server
                </p>
              )}
            </div>
          </div>
          {status !== "in-sync" && (
            <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
              <div className="flex flex-col gap-2 text-xs">
                {(status === "diff" || status === "server-only") && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleForceToLocal}
                      disabled={
                        forceLocalState === "busy" ||
                        forceServerState === "busy"
                      }
                    >
                      {forceLocalState === "busy" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : null}
                      <span className="text-xs">
                        {forceLocalState === "busy"
                          ? "Forcing…"
                          : t.maintenance.forceToLocal}
                      </span>
                    </Button>
                    {forceLocalState === "done" && (
                      <span className="text-green-600 dark:text-green-500 flex items-center text-xs">
                        Done
                      </span>
                    )}
                    {forceLocalState === "error" && (
                      <span className="text-destructive flex items-center text-xs">
                        Error
                      </span>
                    )}
                  </div>
                )}
                {(status === "diff" || status === "local-only") && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleForceToServer}
                      disabled={
                        forceLocalState === "busy" ||
                        forceServerState === "busy"
                      }
                    >
                      {forceServerState === "busy" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : null}
                      <span className="text-xs">
                        {forceServerState === "busy"
                          ? "Forcing…"
                          : t.maintenance.forceToServer}
                      </span>
                    </Button>
                    {forceServerState === "done" && (
                      <span className="text-green-600 dark:text-green-500 flex items-center text-xs">
                        Done
                      </span>
                    )}
                    {forceServerState === "error" && (
                      <span className="text-destructive flex items-center text-xs">
                        Error
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Comparison card (local + server)
// ---------------------------------------------------------------------------

type ComparisonLoadState = "idle" | "loading" | "loaded" | "error";

interface ComparisonData {
  local: Map<string, TidatraDoc>;
  server: Map<string, TidatraDoc>;
}

function ComparisonCard() {
  const [state, setState] = useState<ComparisonLoadState>("idle");
  const [data, setData] = useState<ComparisonData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { data: session } = useSession();

  async function load() {
    setState("loading");
    try {
      const localResult = await (async () => {
        const db = await getDb();
        const result = await db.allDocs<TidatraDoc>({ include_docs: true });
        return new Map(
          result.rows
            .map((r) => r.doc!)
            .filter(Boolean)
            .filter((d) => d.type === "series" || d.type === "entry")
            .map((d) => [d._id, d]),
        );
      })();

      const serverRes = session
        ? await (async () => {
            const res = await fetch("/api/sync?since=0");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { docs: TidatraDoc[] };
            return new Map(
              (data.docs ?? [])
                .filter((d) => d.type === "series" || d.type === "entry")
                .map((d) => [d._id, d]),
            );
          })()
        : new Map();

      setData({ local: localResult, server: serverRes });
      setState("loaded");
      setExpanded(true);
    } catch {
      setState("error");
    }
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Data Comparison</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={state === "loading"}
            >
              {state === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {state === "loading" ? "Loading…" : "Load"}
            </Button>
          </div>
        </CardHeader>

        {state === "error" && (
          <CardContent>
            <p className="text-sm text-destructive">
              Failed to load. Are you signed in?
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  const allIds = new Set([...data.local.keys(), ...data.server.keys()]);
  const docs = Array.from(allIds).sort();

  const series = docs.filter((id) => {
    const local = data.local.get(id);
    const server = data.server.get(id);
    const doc = local ?? server;
    return doc?.type === "series";
  });

  const entries = docs.filter((id) => {
    const local = data.local.get(id);
    const server = data.server.get(id);
    const doc = local ?? server;
    return doc?.type === "entry";
  });

  const deletedCount = docs.filter((id) => {
    const local = data.local.get(id);
    const server = data.server.get(id);
    const doc = local ?? server;
    return doc && "deletedAt" in doc && !!doc.deletedAt;
  }).length;

  const statusCounts = {
    inSync: docs.filter(
      (id) =>
        getComparisonStatus(
          data.local.get(id) ?? null,
          data.server.get(id) ?? null,
        ) === "in-sync",
    ).length,
    diff: docs.filter(
      (id) =>
        getComparisonStatus(
          data.local.get(id) ?? null,
          data.server.get(id) ?? null,
        ) === "diff",
    ).length,
    localOnly: docs.filter(
      (id) =>
        getComparisonStatus(
          data.local.get(id) ?? null,
          data.server.get(id) ?? null,
        ) === "local-only",
    ).length,
    serverOnly: docs.filter(
      (id) =>
        getComparisonStatus(
          data.local.get(id) ?? null,
          data.server.get(id) ?? null,
        ) === "server-only",
    ).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Data Comparison</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {state === "loading" ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <button
          className="flex w-full items-center gap-2 text-sm font-medium"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <span className="flex-1">
            {session ? (
              <>
                {statusCounts.inSync} in-sync · {statusCounts.diff} diff ·{" "}
                {statusCounts.localOnly} local-only · {statusCounts.serverOnly}{" "}
                server-only
              </>
            ) : (
              <>
                {series.length} series · {entries.length} entries
              </>
            )}
          </span>
          {deletedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({deletedCount} soft-deleted)
            </span>
          )}
        </button>

        {!session && (
          <p className="text-xs text-muted-foreground">
            Sign in to compare with server data.
          </p>
        )}

        {expanded && (
          <div className="space-y-4">
            {[
              { label: "Series", subset: series },
              { label: "Entries", subset: entries },
            ].map(({ label, subset }) =>
              subset.length === 0 ? null : (
                <section key={label} className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label} ({subset.length})
                  </h3>
                  <ul className="space-y-1">
                    {subset.map((id) => (
                      <ComparisonDocRow
                        key={id}
                        id={id}
                        local={data.local.get(id) ?? null}
                        server={data.server.get(id) ?? null}
                        onRefresh={load}
                      />
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dedupe + end-link card
// ---------------------------------------------------------------------------

type ScanStatus = "idle" | "scanning" | "scanned" | "error";

function DedupeCard() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [plan, setPlan] = useState<DedupePlan | null>(null);
  const [endLinkGroups, setEndLinkGroups] = useState<DuplicateEndLinkGroup[]>(
    [],
  );

  // Merge duplicates state
  const [mergeStatus, setMergeStatus] = useState<
    "idle" | "busy" | "done" | "error"
  >("idle");
  const [mergedCount, setMergedCount] = useState(0);

  // End-link repair state
  const [fixStatus, setFixStatus] = useState<
    "idle" | "busy" | "done" | "error"
  >("idle");
  const [fixedCount, setFixedCount] = useState(0);

  const { trigger: syncNow } = useSyncContext();

  const busy =
    scanStatus === "scanning" || mergeStatus === "busy" || fixStatus === "busy";

  async function scan() {
    setScanStatus("scanning");
    setMergeStatus("idle");
    setFixStatus("idle");
    try {
      const result = await dryRunDedupe();
      setPlan(result.plan);
      setEndLinkGroups(result.endLinkGroups);
      setScanStatus("scanned");
    } catch {
      setScanStatus("error");
    }
  }

  async function merge() {
    if (!plan) return;
    if (!window.confirm(t.maintenance.confirmMerge)) return;
    setMergeStatus("busy");
    try {
      const result = await applyDedupe(plan);
      setMergedCount(result.written);
      setMergeStatus("done");
      syncNow();
    } catch {
      setMergeStatus("error");
    }
  }

  async function fixEndLinks() {
    if (
      !window.confirm(
        "Unlink extra end entries? They will appear as orphan ends and can be re-linked manually.",
      )
    )
      return;
    setFixStatus("busy");
    try {
      const written = await repairDuplicateEndLinks(endLinkGroups);
      setFixedCount(written);
      setFixStatus("done");
      syncNow();
    } catch {
      setFixStatus("error");
    }
  }

  const seriesGroups = plan?.seriesGroups ?? [];
  const entryGroups = plan?.entryGroups ?? [];
  const hasDuplicates = seriesGroups.length > 0 || entryGroups.length > 0;
  const dupSeries = seriesGroups.reduce((n, g) => n + g.duplicates.length, 0);
  const dupEntries = entryGroups.reduce((n, g) => n + g.duplicates.length, 0);
  const hasEndLinkIssues = endLinkGroups.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.maintenance.dedupeHeading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t.maintenance.dedupeIntro}
        </p>

        <Button onClick={scan} disabled={busy}>
          {scanStatus === "scanning" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {scanStatus === "scanning"
            ? t.maintenance.scanning
            : t.maintenance.scan}
        </Button>

        {scanStatus === "error" && (
          <p className="text-sm text-destructive">{t.maintenance.error}</p>
        )}

        {scanStatus === "scanned" && (
          <div className="space-y-6">
            {/* ── Duplicate docs section ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                {t.maintenance.dedupeHeading}
              </h2>
              {hasDuplicates ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    {t.maintenance.foundSummary(dupSeries, dupEntries)}
                  </p>

                  {seriesGroups.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {seriesGroups.map((g) => (
                        <li
                          key={g.canonical._id}
                          className="rounded border px-3 py-2"
                        >
                          <span className="font-medium">
                            {g.canonical.title || g.canonical._id}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            · {t.maintenance.mergesLabel(g.duplicates.length)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {entryGroups.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {entryGroups.map((g) => (
                        <li
                          key={g.canonical._id}
                          className="rounded border px-3 py-2"
                        >
                          <span className="font-medium">
                            {g.canonical.label ||
                              t.entries.types[g.canonical.entryType]}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            · {formatDateTime(g.canonical.timestamp)} ·{" "}
                            {t.maintenance.mergesLabel(g.duplicates.length)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {t.maintenance.mergeNote}
                  </p>

                  {mergeStatus === "done" ? (
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">
                      {t.maintenance.mergeSuccess(mergedCount)}
                    </p>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={merge}
                      disabled={busy}
                    >
                      {mergeStatus === "busy" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Merge className="size-4" />
                      )}
                      {mergeStatus === "busy"
                        ? t.maintenance.merging
                        : t.maintenance.merge}
                    </Button>
                  )}
                  {mergeStatus === "error" && (
                    <p className="text-sm text-destructive">
                      {t.maintenance.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.maintenance.noDuplicates}
                </p>
              )}
            </section>

            <div className="border-t" />

            {/* ── Duplicate end-link section ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                {t.maintenance.endLinkHeading}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.maintenance.endLinkIntro}
              </p>

              {hasEndLinkIssues ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    {t.maintenance.endLinkFound(endLinkGroups.length)}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {endLinkGroups.map((g) => (
                      <li
                        key={g.start._id}
                        className="rounded border px-3 py-2 space-y-1.5"
                      >
                        <div className="font-medium">
                          {t.maintenance.endLinkStartLabel}:{" "}
                          {g.start.label || t.entries.types.span_start} ·{" "}
                          {formatDateTime(g.start.timestamp)}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {g.start._id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.maintenance.endLinkKeep(
                            g.keepEnd.label ?? "",
                            formatDateTime(g.keepEnd.timestamp),
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {g.keepEnd._id}
                        </div>
                        {g.unlinkEnds.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              {t.maintenance.endLinkUnlink(g.unlinkEnds.length)}
                            </div>
                            {g.unlinkEnds.map((e) => (
                              <div
                                key={e._id}
                                className="font-mono text-xs text-amber-600 dark:text-amber-400"
                              >
                                {e._id}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {fixStatus === "done" ? (
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">
                      {t.maintenance.fixEndLinksSuccess(fixedCount)}
                    </p>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={fixEndLinks}
                      disabled={busy}
                    >
                      {fixStatus === "busy" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {fixStatus === "busy"
                        ? t.maintenance.fixingEndLinks
                        : t.maintenance.fixEndLinks}
                    </Button>
                  )}
                  {fixStatus === "error" && (
                    <p className="text-sm text-destructive">
                      {t.maintenance.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.maintenance.endLinkNoIssues}
                </p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MaintenancePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t.maintenance.backToHome}
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{t.maintenance.title}</h1>
      </div>

      <DedupeCard />

      <ComparisonCard />
    </main>
  );
}
