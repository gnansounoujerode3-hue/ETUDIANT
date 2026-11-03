"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, MailCheck } from "lucide-react";
import { Logo } from "./logo";
import { Button, Card, Input, Label } from "./ui";
import { useI18n } from "@/lib/i18n";

export function RecoveryForm({ mode }: { mode: "forgot" | "reset" | "verify" }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(mode === "verify");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (mode !== "verify") return;
    if (!token) {
      queueMicrotask(() => {
        setMessage(fr ? "Lien de vérification invalide." : "Invalid verification link.");
        setBusy(false);
      });
      return;
    }
    fetch("/api/auth/recovery/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (res) => { if (!res.ok) throw new Error(); setSuccess(true); setMessage(fr ? "Adresse email confirmée." : "Email address confirmed."); })
      .catch(() => setMessage(fr ? "Ce lien est invalide ou a expiré." : "This link is invalid or expired."))
      .finally(() => setBusy(false));
  }, [fr, mode, token]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const action = mode === "forgot" ? "request-reset" : "reset-password";
    const body = mode === "forgot" ? { email } : { token, password };
    try {
      const res = await fetch(`/api/auth/recovery/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setSuccess(true);
      setMessage(mode === "forgot"
        ? (fr ? "Si ce compte existe, un email de réinitialisation vient d’être envoyé." : "If this account exists, a reset email has been sent.")
        : (fr ? "Mot de passe modifié. Redirection…" : "Password changed. Redirecting…"));
      if (mode === "reset") setTimeout(() => router.push("/dashboard"), 900);
    } catch { setMessage(fr ? "Le lien est invalide, expiré ou la demande a échoué." : "The link is invalid, expired, or the request failed."); }
    finally { setBusy(false); }
  }

  const title = mode === "forgot" ? (fr ? "Mot de passe oublié" : "Forgot password") : mode === "reset" ? (fr ? "Nouveau mot de passe" : "New password") : (fr ? "Vérification de l’email" : "Email verification");
  return <main className="flex min-h-dvh items-center justify-center px-4 py-10">
    <Card className="w-full max-w-md p-7 sm:p-9">
      <Link href="/" className="inline-block"><Logo /></Link>
      <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-violet/15 text-violet-200">{mode === "verify" ? <MailCheck /> : <KeyRound />}</div>
      <h1 className="mt-4 text-2xl font-black text-white">{title}</h1>
      {message && <p role="status" className={`mt-4 rounded-2xl border p-3 text-sm ${success ? "border-emerald/25 bg-emerald/10 text-emerald-200" : "border-rose/25 bg-rose/10 text-rose-200"}`}>{message}</p>}
      {mode !== "verify" && !success && <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "forgot" ? <div><Label htmlFor="recovery-email">Email</Label><Input id="recovery-email" type="email" autoComplete="email" className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} required /></div> : <div><Label htmlFor="recovery-password">{fr ? "Nouveau mot de passe — 10 caractères minimum" : "New password — 10 characters minimum"}</Label><Input id="recovery-password" type="password" autoComplete="new-password" minLength={10} className="mt-2" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}
        <Button className="w-full" disabled={busy || (mode === "reset" && !token)}>{busy ? "…" : mode === "forgot" ? (fr ? "Envoyer le lien" : "Send link") : (fr ? "Modifier le mot de passe" : "Change password")}</Button>
      </form>}
      <Link href="/login" className="mt-6 block text-center text-sm text-zinc-400 hover:text-white">{fr ? "Retour à la connexion" : "Back to sign in"}</Link>
    </Card>
  </main>;
}
