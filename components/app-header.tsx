"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { t } from "@/lib/i18n/en";
import { useSession, signOut } from "@/lib/auth-client";
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

