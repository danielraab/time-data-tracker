"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "@/lib/auth-client";
import { getDb } from "@/lib/db/pouch";
import { runSync } from "@/lib/db/sync";
import type { TidatraDoc } from "@/lib/types";

export type SyncState = "idle" | "syncing" | "synced" | "error";

interface SyncContextValue {
  state: SyncState;
  /** Manually trigger a sync. No-op when not signed in. */
  trigger: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  state: "idle",
  trigger: () => {},
});

/** Debounce delay (ms) between a local PouchDB write and the automatic sync. */
const AUTO_SYNC_DEBOUNCE_MS = 2_000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;
  const [state, setState] = useState<SyncState>("idle");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  // Guards the changes listener from scheduling an echo sync while a sync run
  // is in flight (e.g. pulled docs writing to PouchDB would otherwise trigger
  // a redundant follow-on sync).
  // NOTE: SyncProvider guard logic is not unit-tested because the project's
  // Vitest config uses the node environment which does not support React
  // rendering. See openspec/changes/sync-in-progress-guard/specs/sync-loop-guard/spec.md
  const syncInProgressRef = useRef(false);

  const trigger = useCallback(() => {
    if (!userId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncInProgressRef.current = true;
    setState("syncing");
    runSync(userId)
      .then(() => {
        syncInProgressRef.current = false;
        setState("synced");
        syncTimerRef.current = setTimeout(() => setState("idle"), 3_000);
      })
      .catch(() => {
        syncInProgressRef.current = false;
        setState("error");
      });
  }, [userId]); // recreated only when the logged-in user changes

  // Sync on login (userId transitions null → value)
  useEffect(() => {
    if (userId && userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      trigger();
    } else if (!userId) {
      prevUserIdRef.current = null;
    }
  }, [userId, trigger]);

  // Re-sync when the browser comes back online
  useEffect(() => {
    window.addEventListener("online", trigger);
    return () => window.removeEventListener("online", trigger);
  }, [trigger]);

  // Auto-sync after any local PouchDB write (debounced)
  useEffect(() => {
    let changes: PouchDB.Core.Changes<TidatraDoc> | null = null;

    (async () => {
      const db = await getDb();
      changes = db
        .changes({ since: "now", live: true })
        .on("change", (change) => {
          // Ignore the checkpoint doc itself to prevent a sync feedback loop
          if (change.id === "sync:checkpoint") return;
          // Skip while a sync is running — pulled docs writing to PouchDB would
          // otherwise schedule an echo sync after every pull that returns data.
          if (syncInProgressRef.current) return;
          if (!userId) return;
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(trigger, AUTO_SYNC_DEBOUNCE_MS);
        });
    })();

    return () => {
      changes?.cancel();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [trigger, userId]);

  return (
    <SyncContext.Provider value={{ state, trigger }}>
      {children}
    </SyncContext.Provider>
  );
}

/** Returns the current sync state and a manual trigger. */
export function useSyncContext(): SyncContextValue {
  return useContext(SyncContext);
}
