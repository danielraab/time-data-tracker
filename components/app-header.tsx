"use client";

import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/i18n/en";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { data: session } = useSession();

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
          {session ? (
            <>
              <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  signOut({
                    fetchOptions: { onSuccess: () => window.location.reload() },
                  })
                }
              >
                {t.auth.signOut}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t.auth.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
