"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Crown, ArrowLeft, ShieldCheck, PartyPopper } from "lucide-react";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { Badge, Button, Card, Spinner } from "./ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PricingView({
  plan,
  isLoggedIn,
  upgraded,
  stripeDemo,
}: {
  plan: "free" | "premium";
  isLoggedIn: boolean;
  upgraded: boolean;
  stripeDemo: boolean;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const checkout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet/20 blur-[130px]" />
      </div>

      {!isLoggedIn && (
        <header className="border-b border-white/[0.05]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link href="/login?mode=login">
                <Button size="sm">{d.nav.login}</Button>
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> {d.common.back}
        </Link>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            {d.pricing.title}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-zinc-400">{d.pricing.subtitle}</p>
        </div>

        {upgraded && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mx-auto mt-8 flex max-w-lg items-center gap-3 border-emerald/25 bg-emerald/[0.07] p-4 text-sm text-emerald-200">
              <PartyPopper className="size-5 shrink-0 text-emerald" />
              <div>
                {d.pricing.upgraded}
                {stripeDemo && <span className="block text-xs text-emerald-200/70">{d.pricing.demoNote}</span>}
              </div>
            </Card>
          </motion.div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Gratuit */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={cn("flex h-full flex-col p-7", plan === "free" && "border-white/20")}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{d.pricing.free.name}</h2>
                {plan === "free" && isLoggedIn && (
                  <Badge variant="neutral">{d.pricing.currentPlan}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">{d.pricing.free.desc}</p>
              <p className="mt-6">
                <span className="text-5xl font-black text-white">0&nbsp;€</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {d.pricing.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 size-4 shrink-0 text-zinc-500" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={isLoggedIn ? "/dashboard" : "/login"} className="mt-8 block">
                <Button variant="outline" className="w-full" size="lg">
                  {d.pricing.free.cta}
                </Button>
              </Link>
            </Card>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative flex h-full flex-col overflow-hidden border-violet/40 bg-gradient-to-b from-violet/[0.12] to-transparent p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-violet/25 blur-3xl" />
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-black text-white">
                  <Crown className="size-5 text-amber" /> {d.pricing.premium.name}
                </h2>
                {plan === "premium" ? (
                  <Badge variant="cyan">{d.pricing.currentPlan}</Badge>
                ) : (
                  <Badge>{d.pricing.premium.popular}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">{d.pricing.premium.desc}</p>
              <p className="mt-6">
                <span className="text-5xl font-black text-gradient">7,99&nbsp;€</span>
                <span className="text-sm text-zinc-400"> {d.pricing.monthly}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {d.pricing.premium.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-200">
                    <Check className="mt-0.5 size-4 shrink-0 text-cyan" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 w-full"
                onClick={checkout}
                disabled={busy || plan === "premium"}
              >
                {busy ? <Spinner className="size-4" /> : <Crown className="size-4" />}
                {plan === "premium" ? d.pricing.currentPlan : d.pricing.premium.cta}
              </Button>
              {stripeDemo && plan !== "premium" && (
                <p className="mt-3 text-center text-[11px] text-zinc-500">{d.pricing.demoNote}</p>
              )}
            </Card>
          </motion.div>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
          <ShieldCheck className="size-4" /> {d.pricing.secure}
        </p>
      </main>
    </div>
  );
}
