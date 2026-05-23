import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/i18n/en";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.svg" alt="" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">
            {t.app.name}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {t.app.tagline}
          </span>
        </Link>
      </div>
    </header>
  );
}
