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
  ArrowLeftRight,
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
import { formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n/en";
import type { TidatraDoc } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchRemoteDocs(ids: string[]): Promise<Map<string, TidatraDoc>> {
  const res = await fetch("/api/maintenance/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { docs: TidatraDoc[] };
  return new Map(data.docs.map((d) => [d._id, d]));
}

async function fetchLocalDoc(id: string): Promise<TidatraDoc | null> {
  const db = await getDb();
  try {
    return (await db.get(id)) as TidatraDoc;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-document row with optional side-by-side comparison
// ---------------------------------------------------------------------------

interface DocRowProps {
  doc: TidatraDoc;
  /** Which side is the "other" to compare against */
  otherSide: "local" | "remote";
}

function DocRow({ doc, otherSide }: DocRowProps) {
  const [open, setOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [other, setOther] = useState<TidatraDoc | null | "missing">(null);

  const deleted = "deletedAt" in doc && !!doc.deletedAt;

  async function loadOther() {
    setComparing(true);
    try {
      if (otherSide === "remote") {
        const map = await fetchRemoteDocs([doc._id]);
        setOther(map.get(doc._id) ?? "missing");
      } else {
        const local = await fetchLocalDoc(doc._id);
        setOther(local ?? "missing");
      }
    } catch {
      setOther("missing");
    } finally {
      setComparing(false);
    }
  }

  const sideLabel = otherSide === "remote" ? "server" : "local";
  const showComparison = other !== null;

  return (
    <li className="rounded border text-xs">
      {/* Summary row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          className="flex flex-1 items-start gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown className="mt-px size-3 shrink-0" />
          ) : (
            <ChevronRight className="mt-px size-3 shrink-0" />
          )}
          <span
            className={`flex-1 font-mono break-all ${deleted ? "text-muted-foreground line-through" : ""}`}
          >
            {doc._id}
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
        <button
          className="ml-1 flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          title={`Compare with ${sideLabel}`}
          onClick={loadOther}
          disabled={comparing}
        >
          {comparing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="size-3" />
          )}
        </button>
      </div>

      {/* Expanded detail — single doc or side-by-side */}
      {(open || showComparison) && (
        <div className={`border-t ${showComparison ? "grid grid-cols-2 divide-x" : ""}`}>
          {/* This side */}
          <div>
            {showComparison && (
              <div className="bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {otherSide === "remote" ? "Local" : "Server"}
              </div>
            )}
            <pre className="overflow-x-auto bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>

          {/* Other side */}
          {showComparison && (
            <div>
              <div className="bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground capitalize">
                {sideLabel}
              </div>
              {other === "missing" ? (
                <p className="px-3 py-2 text-muted-foreground italic">
                  Not found on {sideLabel}
                </p>
              ) : (
                <pre className="overflow-x-auto bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
                  {JSON.stringify(other, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Raw data card
// ---------------------------------------------------------------------------

type RawLoadState = "idle" | "loading" | "loaded" | "error";

interface RawDocsCardProps {
  title: string;
  source: "local" | "remote";
}

function RawDocsCard({ title, source }: RawDocsCardProps) {
  const [state, setState] = useState<RawLoadState>("idle");
  const [docs, setDocs] = useState<TidatraDoc[]>([]);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    setState("loading");
    try {
      if (source === "local") {
        const db = await getDb();
        const result = await db.allDocs<TidatraDoc>({ include_docs: true });
        setDocs(
          result.rows
            .map((r) => r.doc!)
            .filter(Boolean)
            .filter((d) => d.type === "series" || d.type === "entry"),
        );
      } else {
        const res = await fetch("/api/sync?since=0");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { docs: TidatraDoc[] };
        setDocs(data.docs ?? []);
      }
      setState("loaded");
      setExpanded(true);
    } catch {
      setState("error");
    }
  }

  const otherSide = source === "local" ? "remote" : "local";
  const series = docs.filter((d) => d.type === "series");
  const entries = docs.filter((d) => d.type === "entry");
  const deletedCount = docs.filter((d) => "deletedAt" in d && d.deletedAt).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
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
            {state === "loading" ? "Loading…" : state === "loaded" ? "Refresh" : "Load"}
          </Button>
        </div>
      </CardHeader>

      {state === "error" && (
        <CardContent>
          <p className="text-sm text-destructive">Failed to load. Are you signed in?</p>
        </CardContent>
      )}

      {state === "loaded" && (
        <CardContent className="space-y-3">
          <button
            className="flex w-full items-center gap-1 text-sm font-medium"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            {series.length} series · {entries.length} entries
            {deletedCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({deletedCount} soft-deleted)
              </span>
            )}
          </button>

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
                      {subset.map((doc) => (
                        <DocRow key={doc._id} doc={doc} otherSide={otherSide} />
                      ))}
                    </ul>
                  </section>
                ),
              )}
            </div>
          )}
        </CardContent>
      )}
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
  const [endLinkGroups, setEndLinkGroups] = useState<DuplicateEndLinkGroup[]>([]);

  // Merge duplicates state
  const [mergeStatus, setMergeStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [mergedCount, setMergedCount] = useState(0);

  // End-link repair state
  const [fixStatus, setFixStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [fixedCount, setFixedCount] = useState(0);

  const { trigger: syncNow } = useSyncContext();

  const busy = scanStatus === "scanning" || mergeStatus === "busy" || fixStatus === "busy";

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
    if (!window.confirm("Unlink extra end entries? They will appear as orphan ends and can be re-linked manually.")) return;
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
        <p className="text-sm text-muted-foreground">{t.maintenance.dedupeIntro}</p>

        <Button onClick={scan} disabled={busy}>
          {scanStatus === "scanning" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {scanStatus === "scanning" ? t.maintenance.scanning : t.maintenance.scan}
        </Button>

        {scanStatus === "error" && (
          <p className="text-sm text-destructive">{t.maintenance.error}</p>
        )}

        {scanStatus === "scanned" && (
          <div className="space-y-6">

            {/* ── Duplicate docs section ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{t.maintenance.dedupeHeading}</h2>
              {hasDuplicates ? (
                <div className="space-y-3">
                  <p className="text-sm">{t.maintenance.foundSummary(dupSeries, dupEntries)}</p>

                  {seriesGroups.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {seriesGroups.map((g) => (
                        <li key={g.canonical._id} className="rounded border px-3 py-2">
                          <span className="font-medium">{g.canonical.title || g.canonical._id}</span>{" "}
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
                        <li key={g.canonical._id} className="rounded border px-3 py-2">
                          <span className="font-medium">
                            {g.canonical.label || t.entries.types[g.canonical.entryType]}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            · {formatDateTime(g.canonical.timestamp)} ·{" "}
                            {t.maintenance.mergesLabel(g.duplicates.length)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-xs text-muted-foreground">{t.maintenance.mergeNote}</p>

                  {mergeStatus === "done" ? (
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">
                      {t.maintenance.mergeSuccess(mergedCount)}
                    </p>
                  ) : (
                    <Button variant="destructive" onClick={merge} disabled={busy}>
                      {mergeStatus === "busy" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Merge className="size-4" />
                      )}
                      {mergeStatus === "busy" ? t.maintenance.merging : t.maintenance.merge}
                    </Button>
                  )}
                  {mergeStatus === "error" && (
                    <p className="text-sm text-destructive">{t.maintenance.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.maintenance.noDuplicates}</p>
              )}
            </section>

            <div className="border-t" />

            {/* ── Duplicate end-link section ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{t.maintenance.endLinkHeading}</h2>
              <p className="text-sm text-muted-foreground">{t.maintenance.endLinkIntro}</p>

              {hasEndLinkIssues ? (
                <div className="space-y-3">
                  <p className="text-sm">{t.maintenance.endLinkFound(endLinkGroups.length)}</p>
                  <ul className="space-y-2 text-sm">
                    {endLinkGroups.map((g) => (
                      <li key={g.start._id} className="rounded border px-3 py-2 space-y-1">
                        <div className="font-medium">
                          {t.maintenance.endLinkStartLabel}:{" "}
                          {g.start.label || t.entries.types.span_start} ·{" "}
                          {formatDateTime(g.start.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.maintenance.endLinkKeep(g.keepEnd.label ?? "", formatDateTime(g.keepEnd.timestamp))}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          {t.maintenance.endLinkUnlink(g.unlinkEnds.length)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {fixStatus === "done" ? (
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">
                      {t.maintenance.fixEndLinksSuccess(fixedCount)}
                    </p>
                  ) : (
                    <Button variant="destructive" onClick={fixEndLinks} disabled={busy}>
                      {fixStatus === "busy" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {fixStatus === "busy" ? t.maintenance.fixingEndLinks : t.maintenance.fixEndLinks}
                    </Button>
                  )}
                  {fixStatus === "error" && (
                    <p className="text-sm text-destructive">{t.maintenance.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.maintenance.endLinkNoIssues}</p>
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

      <RawDocsCard title="Local data (PouchDB)" source="local" />
      <RawDocsCard title="Server data (CouchDB)" source="remote" />
    </main>
  );
}
