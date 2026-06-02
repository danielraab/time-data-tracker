"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSeries, listArchivedSeries } from "@/lib/db/series-repo";
import { exportData, importData, type ExportFile, type ImportResult } from "@/lib/db/transfer";
import { t } from "@/lib/i18n/en";
import type { Series } from "@/lib/types";

// ---------------------------------------------------------------------------
// Export card
// ---------------------------------------------------------------------------

function ExportCard() {
  const [activeSeries, setActiveSeries] = useState<Series[]>([]);
  const [archivedSeries, setArchivedSeries] = useState<Series[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listSeries(), listArchivedSeries()]).then(([active, archived]) => {
      setActiveSeries(active);
      setArchivedSeries(archived);
      setSelected(new Set(active.map((s) => s._id)));
    });
  }, []);

  const allIds = [...activeSeries, ...archivedSeries].map((s) => s._id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const file = await exportData([...selected]);
      const json = JSON.stringify(file, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tidatra-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  const noSeries = activeSeries.length === 0 && archivedSeries.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.transfer.exportHeading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.transfer.exportIntro}</p>

        {noSeries ? (
          <p className="text-sm text-muted-foreground">{t.transfer.noSeries}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selected.size} / {allIds.length} selected
              </span>
              <button
                className="text-sm text-primary hover:underline"
                onClick={toggleAll}
              >
                {allSelected ? t.transfer.deselectAll : t.transfer.selectAll}
              </button>
            </div>

            <ul className="space-y-1">
              {activeSeries.map((s) => (
                <li key={s._id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(s._id)}
                      onChange={() => toggleOne(s._id)}
                    />
                    <span className="text-sm">{s.title || t.series.untitled}</span>
                  </label>
                </li>
              ))}
            </ul>

            {archivedSeries.length > 0 && (
              <div className="space-y-1">
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowArchived((v) => !v)}
                >
                  {showArchived ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  {t.transfer.archivedSection} ({archivedSeries.length})
                </button>
                {showArchived && (
                  <ul className="space-y-1 pl-4">
                    {archivedSeries.map((s) => (
                      <li key={s._id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selected.has(s._id)}
                            onChange={() => toggleOne(s._id)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {s.title || t.series.untitled}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button onClick={handleExport} disabled={busy || selected.size === 0}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {busy ? t.transfer.exportButtonBusy : t.transfer.exportButton}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Import card
// ---------------------------------------------------------------------------

type ImportState =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "done"; result: ImportResult }
  | { status: "error"; message: string };

function ImportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ status: "idle" });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState({ status: "busy" });

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        let parsed: ExportFile;
        try {
          parsed = JSON.parse(raw) as ExportFile;
        } catch {
          setState({ status: "error", message: t.transfer.importError });
          return;
        }
        if (parsed.version !== 1) {
          setState({ status: "error", message: t.transfer.importVersionError });
          return;
        }
        const result = await importData(parsed);
        setState({ status: "done", result });
      } catch {
        setState({ status: "error", message: t.transfer.importError });
      } finally {
        // Reset input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const totalSkipped =
    state.status === "done"
      ? state.result.seriesSkipped + state.result.entriesSkipped
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.transfer.importHeading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.transfer.importIntro}</p>

        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          onClick={() => inputRef.current?.click()}
          disabled={state.status === "busy"}
          variant="outline"
        >
          {state.status === "busy" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {state.status === "busy" ? t.transfer.importBusy : t.transfer.importButton}
        </Button>

        {state.status === "done" && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-green-600 dark:text-green-500">
              {t.transfer.importSuccess(
                state.result.seriesInserted + state.result.seriesUpdated,
                state.result.entriesInserted + state.result.entriesUpdated,
              )}
            </p>
            {totalSkipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.transfer.importSkipped(totalSkipped)}
              </p>
            )}
          </div>
        )}

        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExportImportPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t.transfer.backToHome}
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{t.transfer.title}</h1>
      </div>

      <ExportCard />
      <ImportCard />
    </main>
  );
}
