"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, AlertCircle, ExternalLink } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.7 12 .7 7.7.7 3.99 3.17 2.18 6.86l3.66 2.84C6.71 7.07 9.14 5.04 12 5.04z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58l3.66 2.84c2.14-1.97 3.77-4.91 3.77-8.66z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L2.18 6.86A11.3 11.3 0 0 0 .7 12c0 1.82.44 3.55 1.48 5.14l3.66-2.85z"
      />
      <path
        fill="#34A853"
        d="M12 23.3c3.04 0 5.6-1 7.46-2.72l-3.66-2.84c-1.01.68-2.31 1.1-3.8 1.1-2.86 0-5.29-2.03-6.16-4.76l-3.66 2.85C3.99 20.53 7.7 23.3 12 23.3z"
      />
    </svg>
  );
}
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { Button, Card, Input, Label, Spinner } from "./ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AuthForm({
  initialMode = "signup",
}: {
  initialMode?: "login" | "signup";
}) {
  const { d, lang } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [continuationUrl, setContinuationUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setContinuationUrl(null);
    setBusy(true);

    let embedded = false;
    try {
      embedded = window.self !== window.top;
    } catch {
      embedded = true;
    }

    // L'ouverture a lieu directement pendant le clic utilisateur, avant tout
    // await : Safari l'autorise alors qu'il bloquerait un popup ouvert plus tard.
    const firstPartyTab = embedded ? window.open("about:blank", "_blank") : null;
    if (firstPartyTab) {
      try {
        firstPartyTab.document.title = "Voxa — Connexion…";
        firstPartyTab.document.body.style.cssText =
          "margin:0;background:#030303;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh";
        firstPartyTab.document.body.textContent =
          lang === "fr" ? "Connexion à Voxa…" : "Signing in to Voxa…";
      } catch {
        /* about:blank peut être inaccessible selon la politique du navigateur */
      }
    }

    const closePendingTab = () => {
      if (firstPartyTab && !firstPartyTab.closed) firstPartyTab.close();
    };

    const complete = (payload: { continueUrl?: string }) => {
      if (payload.continueUrl) {
        const absolute = new URL(payload.continueUrl, window.location.origin).toString();
        setContinuationUrl(absolute);
        setInfo(
          lang === "fr"
            ? "Connexion validée. Voxa s'ouvre dans un onglet sécurisé."
            : "Sign-in confirmed. Voxa is opening in a secure tab."
        );
        if (firstPartyTab && !firstPartyTab.closed) {
          firstPartyTab.location.replace(absolute);
        }
        return;
      }
      closePendingTab();
      router.push("/dashboard");
      router.refresh();
    };

    try {
      const res = await fetch(`/api/auth/${mode === "signup" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, locale: lang, embedded }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        continueUrl?: string;
      };
      if (!res.ok) {
        const key = json.error;
        // Compte déjà existant saisi sur l'onglet inscription : on tente la connexion.
        if (key === "taken" && mode === "signup") {
          const retry = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, embedded }),
          });
          const rj = (await retry.json().catch(() => ({}))) as {
            error?: string;
            continueUrl?: string;
          };
          if (retry.ok) {
            complete(rj);
            return;
          }
          closePendingTab();
          setMode("login");
          setError(
            rj.error === "wrong"
              ? `${d.auth.errors.taken} ${d.auth.errors.wrong}`
              : d.auth.errors.generic
          );
          return;
        }
        closePendingTab();
        setError(
          key === "wrong"
            ? d.auth.errors.wrong
            : key === "invalid"
              ? d.auth.errors.invalid
              : d.auth.errors.generic
        );
        return;
      }
      complete(json);
    } catch {
      closePendingTab();
      setError(d.auth.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const res = await fetch("/api/auth/google", { method: "POST" });
    if (res.status === 501) setInfo(d.auth.googleNotConfigured);
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet/20 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-cyan/10 blur-[120px]" />
      </div>

      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="p-7 sm:p-9">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {mode === "signup" ? d.auth.signupTitle : d.auth.loginTitle}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">{d.auth.subtitle}</p>

          <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">
            <GoogleIcon className="size-4" /> {d.auth.google}
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-600">
            <span className="h-px flex-1 bg-white/10" />
            {d.auth.or}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">{d.auth.name}</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="name"
                    className="pl-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{d.auth.email}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  className="pl-11"
                  placeholder="lea@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{d.auth.password}</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  required
                  className="pl-11"
                  placeholder={mode === "signup" ? d.auth.passwordHint : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            </div>

            {(error || info) && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                  error
                    ? "border-rose/25 bg-rose/10 text-rose-200"
                    : "border-amber/25 bg-amber/10 text-amber-200"
                )}
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error ?? info}</span>
              </div>
            )}

            {continuationUrl && (
              <a
                href={continuationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-5 text-sm font-bold text-white shadow-[0_8px_30px_-6px_rgba(139,92,246,0.55)] transition-all hover:brightness-110"
              >
                <ExternalLink className="size-4" />
                {lang === "fr"
                  ? "Ouvrir Voxa dans un nouvel onglet"
                  : "Open Voxa in a new tab"}
              </a>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={busy || !!continuationUrl}>
              {busy && <Spinner className="size-4" />}
              {mode === "signup" ? d.auth.submitSignup : d.auth.submitLogin}
            </Button>
          </form>

          {/* Accès rapide aux comptes de démonstration */}
          <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Comptes démo · mot de passe : motdepasse123
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmail("demo@voxa.app");
                  setPassword("motdepasse123");
                  setError(null);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-cyan/40 hover:text-white"
              >
                Gratuit
                <span className="block text-[10px] font-normal text-zinc-500">demo@voxa.app</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmail("ines@exemple.fr");
                  setPassword("motdepasse123");
                  setError(null);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-cyan/40 hover:text-white"
              >
                Premium
                <span className="block text-[10px] font-normal text-zinc-500">ines@exemple.fr</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "signup" ? d.auth.hasAccount : d.auth.noAccount}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
                setInfo(null);
              }}
              className="font-semibold text-cyan hover:underline"
            >
              {mode === "signup" ? d.auth.switchLogin : d.auth.switchSignup}
            </button>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
