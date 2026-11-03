"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Upload,
  BadgeCheck,
  ChevronDown,
  ArrowRight,
  Sparkles,
  FileText,
  GraduationCap,
  AudioLines,
} from "lucide-react";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { Badge, Button, Card, SoundWave } from "./ui";
import { useI18n } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Compteur animé (déclenché quand visible)
// ---------------------------------------------------------------------------
function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const dur = 1600;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {value.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------
export function Landing({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const [students, setStudents] = useState(12480);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/public-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.students) setStudents(j.students);
      })
      .catch(() => {});
  }, []);

  const ctaHref = isLoggedIn ? "/dashboard" : "/login";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* --- Fond : aurores + grille --- */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet/25 blur-[140px] animate-aurora" />
        <div className="absolute top-[55%] -left-40 h-[420px] w-[520px] rounded-full bg-cyan/12 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[480px] rounded-full bg-violet/12 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* --- Navigation --- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Voxa">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#how" className="transition-colors hover:text-white">
              {d.nav.how}
            </a>
            <a href="#reviews" className="transition-colors hover:text-white">
              {d.nav.reviews}
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              {d.nav.faq}
            </a>
            <Link href="/pricing" className="transition-colors hover:text-white">
              {d.nav.pricing}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Button size="sm" onClick={() => router.push("/dashboard")}>
                {d.nav.dashboard}
              </Button>
            ) : (
              <>
                <Link
                  href="/login?mode=login"
                  className="hidden rounded-full px-3 py-2 text-sm text-zinc-300 hover:text-white sm:block"
                >
                  {d.nav.login}
                </Link>
                <Button size="sm" onClick={() => (window.location.href = ctaHref)}>
                  {d.nav.start}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --- Hero --- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 md:pt-40 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="default" className="mb-6">
              <Sparkles className="size-3.5" /> {d.hero.badge}
            </Badge>
          </motion.div>
          <motion.h1
            className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.4rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            {d.hero.titleA}
            <br />
            <span className="text-gradient">{d.hero.titleB}</span>
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
          >
            {d.hero.subtitle}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
          >
            <Link href={ctaHref}>
              <Button size="lg" className="w-full sm:w-auto">
                {d.hero.ctaPrimary} <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#how" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <AudioLines className="size-4" /> {d.hero.ctaSecondary}
              </Button>
            </a>
          </motion.div>
          <motion.p
            className="mt-5 text-xs text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            {d.hero.note}
          </motion.p>
        </div>

        {/* --- Démo visuelle : carte session orale --- */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet/25 via-transparent to-cyan/20 blur-2xl" />
          <Card className="animate-float overflow-hidden p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan animate-pulse-ring">
                <Mic className="size-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Voxa</p>
                <p className="text-xs text-cyan">{d.hero.demo.listening}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.05] p-4">
              <p className="text-sm leading-relaxed text-zinc-200">{d.hero.demo.question}</p>
            </div>
            <div className="my-5 flex justify-center">
              <SoundWave bars={9} height={34} />
            </div>
            <div className="rounded-2xl rounded-tr-md border border-cyan/20 bg-cyan/[0.06] p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan/80">
                {d.hero.demo.you}
              </p>
              <p className="text-sm leading-relaxed text-zinc-200">{d.hero.demo.transcript}</p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Badge variant="amber">{d.hero.demo.verdict}</Badge>
              <Badge variant="neutral">{d.hero.demo.score}</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">{d.hero.demo.feedback}</p>
          </Card>
        </motion.div>
      </section>

      {/* --- Preuve sociale --- */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 text-center sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">
              <AnimatedCounter to={students} />
            </p>
            <p className="mt-1 text-sm text-zinc-500">{d.proof.students}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">
              <AnimatedCounter to={87} suffix="%" />
            </p>
            <p className="mt-1 text-sm text-zinc-500">{d.proof.score}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-white sm:text-4xl">
              ×<AnimatedCounter to={23} suffix={""} />
              <span className="text-lg text-zinc-500">/10</span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">{d.proof.retention}</p>
          </div>
        </div>
      </section>

      {/* --- Comment ça marche --- */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
        <motion.div className="mx-auto max-w-2xl text-center" {...fadeUp}>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {d.steps.title}
          </h2>
          <p className="mt-3 text-zinc-400">{d.steps.subtitle}</p>
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {d.steps.items.map((step, i) => {
            const Icon = [Upload, Mic, BadgeCheck][i];
            return (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="group relative h-full overflow-hidden p-7 transition-colors hover:border-violet/30">
                  <span className="absolute -right-4 -top-6 text-[7rem] font-black leading-none text-white/[0.04] transition-colors group-hover:text-violet/[0.08]">
                    {i + 1}
                  </span>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet/25 to-cyan/20 text-cyan">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-white">
                    <span className="mr-2 text-zinc-600">0{i + 1}</span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.desc}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* --- Avis étudiants --- */}
      <section id="reviews" className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
          <motion.div className="mx-auto max-w-2xl text-center" {...fadeUp}>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {d.testimonials.title}
            </h2>
            <p className="mt-3 text-zinc-400">{d.testimonials.subtitle}</p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {d.testimonials.items.map((t, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="flex h-full flex-col p-7">
                  <GraduationCap className="size-5 text-violet" />
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-300">
                    “{t.quote}”
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-black text-white">
                      {t.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
        <motion.h2
          className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl"
          {...fadeUp}
        >
          {d.faq.title}
        </motion.h2>
        <div className="mt-10 space-y-3">
          {d.faq.items.map((item, i) => {
            const open = openFaq === i;
            return (
              <motion.div key={i} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.05 }}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="glass w-full rounded-2xl p-5 text-left transition-colors hover:border-violet/25"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-white sm:text-base">{item.q}</span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-zinc-500 transition-transform duration-300 ${
                        open ? "rotate-180 text-cyan" : ""
                      }`}
                    />
                  </div>
                  <div
                    className={`grid transition-all duration-300 ${
                      open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <p className="overflow-hidden text-sm leading-relaxed text-zinc-400">
                      {item.a}
                    </p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* --- CTA final --- */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <motion.div {...fadeUp}>
          <Card className="relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full bg-violet/25 blur-[110px]" />
            <FileText className="mx-auto size-6 text-cyan" />
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {d.cta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-zinc-400">{d.cta.subtitle}</p>
            <Link href={ctaHref}>
              <Button size="xl" className="mt-8">
                <Mic className="size-5" /> {d.cta.button}
              </Button>
            </Link>
          </Card>
        </motion.div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-zinc-500">{d.footer.tagline}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {d.footer.product}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li>
                <a href="#how" className="hover:text-white">
                  {d.nav.how}
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  {d.nav.pricing}
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-white">
                  {d.nav.faq}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {d.footer.legal}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li className="cursor-pointer hover:text-white">Mentions légales</li>
              <li className="cursor-pointer hover:text-white">CGU</li>
              <li className="cursor-pointer hover:text-white">Confidentialité</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Voxa — {d.footer.rights} {d.footer.madeWith}
        </div>
      </footer>
    </div>
  );
}
