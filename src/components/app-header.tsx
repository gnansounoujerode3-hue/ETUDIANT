"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, TrendingUp, CreditCard, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { Badge, Button } from "./ui";
import { useI18n } from "@/lib/i18n";

export function AppHeader({ name, plan }: { name: string | null; plan: "free" | "premium" }) {
  const { d } = useI18n();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/dashboard" aria-label="Voxa">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-zinc-300 sm:flex">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/[0.06] hover:text-white"
          >
            <LayoutDashboard className="size-4" /> {d.nav.dashboard}
          </Link>
          <Link
            href="/lacunes"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/[0.06] hover:text-white"
          >
            <TrendingUp className="size-4" /> {d.nav.gaps}
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/[0.06] hover:text-white"
          >
            <CreditCard className="size-4" /> {d.nav.pricing}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden xs:inline-flex sm:inline-flex" />
          {plan === "premium" ? (
            <Badge variant="cyan">{d.common.premium}</Badge>
          ) : (
            <Button size="sm" variant="soft" onClick={() => router.push("/pricing")}>
              {d.common.upgrade}
            </Button>
          )}
          <button
            onClick={logout}
            title={name ?? d.nav.logout}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-zinc-400 transition-colors hover:border-rose/40 hover:text-rose"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
