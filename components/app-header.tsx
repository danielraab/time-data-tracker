"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, LoaderIcon, LogOutIcon, SettingsIcon, UserIcon, WifiOffIcon } from "lucide-react";
import { t } from "@/lib/i18n/en";
import { useSession, signOut } from "@/lib/auth-client";
import { runSync } from "@/lib/db/sync";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Circular avatar: user image when available, UserIcon otherwise. */
function UserAvatar({
  name,
  email,
  image,
}: {
  name: string | null | undefined;
  email: string;
  image: string | null | undefined;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? email}
        className="size-full object-cover"
      />
    );
  }
  return <UserIcon className="size-4 text-muted-foreground" />;
}

type SyncState = "idle" | "syncing" | "synced" | "error";

function SyncIndicator({ state }: { state: SyncState }) {
  if (state === "idle") return null;
  if (state === "syncing")
    return (
      <span
        className="text-muted-foreground"
        title={t.sync.syncing}
        aria-label={t.sync.syncing}
      >
        <LoaderIcon className="size-4 animate-spin" />
      </span>
    );
  if (state === "synced")
    return (
      <span
        className="text-green-600"
        title={t.sync.synced}
        aria-label={t.sync.synced}
      >
        <CheckIcon className="size-4" />
      </span>
    );
  return (
    <span
      className="text-destructive"
      title={t.sync.syncError}
      aria-label={t.sync.syncError}
    >
      <WifiOffIcon className="size-4" />
    </span>
  );
}

export function AppHeader() {
  const { data: session } = useSession();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const syncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  function triggerSync(userId: string) {
    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    setSyncState("syncing");
    runSync(userId)
      .then(() => {
        setSyncState("synced");
        syncedTimerRef.current = setTimeout(() => setSyncState("idle"), 3000);
      })
      .catch(() => setSyncState("error"));
  }

  // Sync on login (when session user ID changes from null → a real ID)
  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (userId && userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      triggerSync(userId);
    } else if (!userId) {
      prevUserIdRef.current = null;
    }
  }, [session?.user.id]);

  // Re-sync when the browser comes back online
  useEffect(() => {
    function handleOnline() {
      const userId = session?.user.id;
      if (userId) triggerSync(userId);
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [session?.user.id]);

  // Only show sync state while a session is active
  const displaySyncState: SyncState = session ? syncState : "idle";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.svg" alt="" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">
            {t.app.name}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {t.app.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <SyncIndicator state={displaySyncState} />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full overflow-hidden"
                  aria-label={t.auth.accountMenuLabel}
                >
                  <UserAvatar
                    name={session.user.name}
                    email={session.user.email}
                    image={session.user.image}
                  />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    {session.user.name && (
                      <span className="font-medium text-foreground">
                        {session.user.name}
                      </span>
                    )}
                    <span className="truncate text-muted-foreground">
                      {session.user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <SettingsIcon />
                      {t.auth.settings}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => window.location.reload(),
                      },
                    })
                  }
                >
                  <LogOutIcon />
                  {t.auth.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">
                <UserIcon />
                {t.auth.signIn}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

