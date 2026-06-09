"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/en";
import { SYNC_INTERVAL_MS } from "@/lib/db/sync-context";

// ---------------------------------------------------------------------------
// Shared display primitives
// ---------------------------------------------------------------------------

type BadgeVariant = "ok" | "warn" | "error" | "neutral";

function Badge({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const cls =
    variant === "ok"
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
      : variant === "warn"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : variant === "error"
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-[10rem] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service Worker subsection
// ---------------------------------------------------------------------------

type SwState = "unsupported" | "none" | "installing" | "waiting" | "active";

function ServiceWorkerSection() {
  const [swState, setSwState] = useState<SwState>("unsupported");
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadSwState() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) {
          setSwState("none");
        } else if (reg.active) {
          setSwState("active");
        } else if (reg.waiting) {
          setSwState("waiting");
        } else {
          setSwState("installing");
        }
        return caches.keys();
      })
      .then((keys) => setCacheKey(keys.length > 0 ? keys[0] : null))
      .catch(() => {});
  }

  useEffect(() => {
    loadSwState();
  }, []);

  function handleReRegister() {
    setBusy(true);
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        loadSwState();
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  const badgeVariant: BadgeVariant =
    swState === "active"
      ? "ok"
      : swState === "unsupported" || swState === "none"
        ? "warn"
        : "neutral";

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.serviceWorker}
      </h3>
      <Row label="State">
        <Badge label={t.pwaTest.badges[swState]} variant={badgeVariant} />
        {cacheKey && (
          <span className="text-xs text-muted-foreground">
            {t.pwaTest.cacheVersion(cacheKey)}
          </span>
        )}
        {swState === "none" && !cacheKey && (
          <span className="text-xs text-muted-foreground">
            {t.pwaTest.noCacheFound}
          </span>
        )}
      </Row>
      {swState !== "unsupported" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleReRegister}
          disabled={busy}
        >
          {t.pwaTest.buttons.reRegister}
        </Button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Notifications subsection
// ---------------------------------------------------------------------------

type NotifPermission = "unsupported" | "default" | "granted" | "denied";

const NOTIF_BADGE_VARIANT: Record<NotifPermission, BadgeVariant> = {
  granted: "ok",
  denied: "error",
  unsupported: "warn",
  default: "neutral",
};

// `Notification.permission` is a synchronous, browser-only value that changes
// when the user answers a permission prompt or edits browser settings. Modelling
// it as an external store keeps it SSR-safe (no `window` on the server) and
// hydration-stable, and lets the panel reflect changes in real time — without a
// synchronous setState inside an effect.
const notifPermissionListeners = new Set<() => void>();

function subscribeNotifPermission(onChange: () => void) {
  notifPermissionListeners.add(onChange);
  let status: PermissionStatus | undefined;
  navigator.permissions
    ?.query({ name: "notifications" as PermissionName })
    .then((s) => {
      status = s;
      s.addEventListener("change", onChange);
    })
    .catch(() => {});
  return () => {
    notifPermissionListeners.delete(onChange);
    status?.removeEventListener("change", onChange);
  };
}

function emitNotifPermissionChange() {
  for (const onChange of notifPermissionListeners) onChange();
}

function getNotifPermission(): NotifPermission {
  return "Notification" in window
    ? (Notification.permission as NotifPermission)
    : "unsupported";
}

function NotificationsSection() {
  const permission = useSyncExternalStore<NotifPermission>(
    subscribeNotifPermission,
    getNotifPermission,
    () => "unsupported",
  );
  const [sent, setSent] = useState(false);

  function handleRequestPermission() {
    Notification.requestPermission().then(emitNotifPermissionChange);
  }

  function handleSendTest() {
    new Notification("TiDaTra test", {
      body: "Notifications are working.",
    });
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  const badgeVariant = NOTIF_BADGE_VARIANT[permission];

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.notifications}
      </h3>
      <Row label="Permission">
        <Badge label={t.pwaTest.badges[permission]} variant={badgeVariant} />
      </Row>
      {permission === "default" && (
        <Button size="sm" variant="outline" onClick={handleRequestPermission}>
          {t.pwaTest.buttons.requestPermission}
        </Button>
      )}
      {permission === "granted" && (
        <Button size="sm" variant="outline" onClick={handleSendTest}>
          {sent
            ? t.pwaTest.buttons.notificationSent
            : t.pwaTest.buttons.sendTestNotification}
        </Button>
      )}
      {permission === "denied" && (
        <p className="text-xs text-muted-foreground">
          Notifications are blocked. Reset permissions in browser settings.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Geolocation subsection
// ---------------------------------------------------------------------------

interface GpsResult {
  lat: number;
  lon: number;
  accuracyM: number;
  elapsedMs: number;
}

type GpsError = "denied" | "timeout" | "unknown";

const GPS_PERM_BADGE_VARIANT: Record<PermissionState, BadgeVariant> = {
  granted: "ok",
  denied: "error",
  prompt: "neutral",
};

const GPS_ERROR_MESSAGE: Record<GpsError, string> = {
  denied: t.pwaTest.gps.errorDenied,
  timeout: t.pwaTest.gps.errorTimeout,
  unknown: t.pwaTest.gps.errorUnknown,
};

const noopSubscribe = () => () => {};

function GeolocationSection() {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "geolocation" in navigator,
    () => false,
  );
  const [permState, setPermState] = useState<PermissionState | null>(null);
  const [result, setResult] = useState<GpsResult | null>(null);
  const [error, setError] = useState<GpsError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let status: PermissionStatus | undefined;
    const handleChange = () => {
      if (status) setPermState(status.state);
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((s) => {
        status = s;
        setPermState(s.state);
        s.addEventListener("change", handleChange);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", handleChange);
  }, [supported]);

  function handleGetLocation() {
    setResult(null);
    setError(null);
    setBusy(true);
    const start = Date.now();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setResult({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          elapsedMs: Date.now() - start,
        });
        setPermState("granted");
        setBusy(false);
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setError("denied");
          setPermState("denied");
        } else if (err.code === GeolocationPositionError.TIMEOUT) {
          setError("timeout");
        } else {
          setError("unknown");
        }
        setBusy(false);
      },
      { timeout: 15000 },
    );
  }

  if (!supported) {
    return (
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.pwaTest.sections.geolocation}
        </h3>
        <Row label="State">
          <Badge label={t.pwaTest.badges.unsupported} variant="warn" />
        </Row>
      </section>
    );
  }

  const permBadgeVariant: BadgeVariant = permState
    ? GPS_PERM_BADGE_VARIANT[permState]
    : "neutral";

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.geolocation}
      </h3>
      {permState && (
        <Row label={t.pwaTest.gps.permissionLabel}>
          <Badge label={permState} variant={permBadgeVariant} />
        </Row>
      )}
      {result && (
        <>
          <Row label={t.pwaTest.gps.coordsLabel}>
            <span className="font-mono text-xs">
              {result.lat.toFixed(6)}, {result.lon.toFixed(6)}
            </span>
          </Row>
          <Row label={t.pwaTest.gps.accuracyLabel}>
            <span className="text-xs">
              {t.pwaTest.gps.accuracyMetres(result.accuracyM)}
            </span>
          </Row>
          <Row label={t.pwaTest.gps.elapsedLabel}>
            <span className="text-xs">
              {t.pwaTest.gps.elapsedMs(result.elapsedMs)}
            </span>
          </Row>
        </>
      )}
      {error && (
        <p className="text-xs text-destructive">{GPS_ERROR_MESSAGE[error]}</p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleGetLocation}
        disabled={busy || permState === "denied"}
      >
        {busy ? "Getting location…" : t.pwaTest.buttons.getLocation}
      </Button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Periodic Background Sync subsection
// ---------------------------------------------------------------------------

type PeriodicSyncState = "unsupported" | "registered" | "notRegistered";

// Typed shim for the non-standard Periodic Background Sync API.
interface PeriodicSyncManager {
  register(tag: string, opts: { minInterval: number }): Promise<void>;
  getTags(): Promise<string[]>;
}

interface SwRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync: PeriodicSyncManager;
}

function PeriodicSyncSection() {
  const [state, setState] = useState<PeriodicSyncState>("unsupported");
  const [busy, setBusy] = useState(false);
  const regRef = useRef<SwRegistrationWithPeriodicSync | null>(null);

  function loadSyncState() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg || !("periodicSync" in reg)) {
          setState("unsupported");
          return;
        }
        const typedReg = reg as SwRegistrationWithPeriodicSync;
        regRef.current = typedReg;
        return typedReg.periodicSync
          .getTags()
          .then((tags) => {
            setState(
              tags.includes("tidatra-sync") ? "registered" : "notRegistered",
            );
          })
          .catch(() => setState("unsupported"));
      })
      .catch(() => setState("unsupported"));
  }

  useEffect(() => {
    loadSyncState();
  }, []);

  function handleRegister() {
    if (!regRef.current) return;
    setBusy(true);
    regRef.current.periodicSync
      .register("tidatra-sync", { minInterval: SYNC_INTERVAL_MS })
      .then(() => {
        loadSyncState();
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  const badgeVariant: BadgeVariant =
    state === "registered"
      ? "ok"
      : state === "notRegistered"
        ? "warn"
        : "neutral";

  const badgeLabel =
    state === "registered"
      ? t.pwaTest.badges.registered
      : state === "notRegistered"
        ? t.pwaTest.badges.notRegistered
        : t.pwaTest.badges.unsupported;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.periodicSync}
      </h3>
      <Row label="State">
        <Badge label={badgeLabel} variant={badgeVariant} />
      </Row>
      {state === "notRegistered" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegister}
          disabled={busy}
        >
          {t.pwaTest.buttons.registerSync}
        </Button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Online/Offline subsection
// ---------------------------------------------------------------------------

function subscribeToOnlineStatus(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function OnlineSection() {
  const online = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true,
  );

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.online}
      </h3>
      <Row label="Status">
        <Badge
          label={online ? t.pwaTest.badges.online : t.pwaTest.badges.offline}
          variant={online ? "ok" : "error"}
        />
      </Row>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Install Prompt subsection
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallPromptSection() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [available, setAvailable] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function handleInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setAvailable(true);
    }
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  function handleInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt().then(() => {
      deferredPrompt.current!.userChoice.then(() => {
        deferredPrompt.current = null;
        setAvailable(false);
        setDone(true);
      });
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.pwaTest.sections.installPrompt}
      </h3>
      <Row label="State">
        <Badge
          label={
            available
              ? t.pwaTest.badges.available
              : t.pwaTest.badges.notAvailable
          }
          variant={available ? "ok" : "neutral"}
        />
        {done && (
          <span className="text-xs text-muted-foreground">
            Install dialog dismissed or accepted.
          </span>
        )}
      </Row>
      {available && (
        <Button size="sm" variant="outline" onClick={handleInstall}>
          {t.pwaTest.buttons.installApp}
        </Button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function PwaHealthPanel() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.pwaTest.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isDev && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {t.pwaTest.devNote}
          </p>
        )}
        <ServiceWorkerSection />
        <div className="border-t" />
        <NotificationsSection />
        <div className="border-t" />
        <GeolocationSection />
        <div className="border-t" />
        <PeriodicSyncSection />
        <div className="border-t" />
        <OnlineSection />
        <div className="border-t" />
        <InstallPromptSection />
      </CardContent>
    </Card>
  );
}
