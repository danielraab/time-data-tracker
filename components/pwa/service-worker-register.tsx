"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { SYNC_INTERVAL_MS } from "@/lib/db/sync-context";

export function ServiceWorkerRegister() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Register Periodic Background Sync only in supported browsers and when
        // the user is signed in (sync requires an account).
        if (isAuthenticated && "periodicSync" in registration) {
          (
            registration as ServiceWorkerRegistration & {
              periodicSync: {
                register(
                  tag: string,
                  opts: { minInterval: number },
                ): Promise<void>;
              };
            }
          ).periodicSync
            .register("tidatra-sync", { minInterval: SYNC_INTERVAL_MS })
            .catch(() => {
              // Permission not granted or API not available — silently skip.
            });
        }
      })
      .catch(() => {
        // Registration failures are non-fatal; the app still works online.
      });
  }, [isAuthenticated]);

  return null;
}
