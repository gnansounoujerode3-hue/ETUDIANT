"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LogOut, Save, Trash2, UserRound } from "lucide-react";
import { AppHeader } from "./app-header";
import { Button, Card, Input, Label } from "./ui";
import { useI18n } from "@/lib/i18n";

export function AccountSettings({ user }: { user: { email: string; name: string | null; locale: string; plan: "free" | "premium" } }) {
  const { lang, setLang } = useI18n();
  const fr = lang === "fr";
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(body: object) {
    const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || "request_failed");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await request({ action: "profile", name, locale: lang });
      setMessage(fr ? "Profil enregistré." : "Profile saved."); router.refresh();
    } catch { setMessage(fr ? "Impossible d’enregistrer le profil." : "Unable to save profile."); }
    finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await request({ action: "password", currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword("");
      setMessage(fr ? "Mot de passe modifié. Les autres sessions ont été fermées." : "Password changed. Other sessions were closed.");
    } catch { setMessage(fr ? "Mot de passe actuel incorrect ou nouveau mot de passe invalide." : "Current password is wrong or the new password is invalid."); }
    finally { setBusy(false); }
  }

  async function logoutAll() {
    setBusy(true);
    try { await request({ action: "logout_all" }); setMessage(fr ? "Les autres appareils ont été déconnectés." : "Other devices were signed out."); }
    catch { setMessage(fr ? "L’opération a échoué." : "The operation failed."); }
    finally { setBusy(false); }
  }

  async function removeAccount() {
    const password = window.prompt(fr ? "Entrez votre mot de passe pour supprimer définitivement votre compte" : "Enter your password to permanently delete your account");
    if (!password) return;
    if (!window.confirm(fr ? "Cette suppression est définitive. Continuer ?" : "This deletion is permanent. Continue?")) return;
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) { router.replace("/"); router.refresh(); return; }
    setMessage(fr ? "Mot de passe incorrect ou suppression impossible." : "Wrong password or deletion failed."); setBusy(false);
  }

  return <div className="min-h-dvh">
    <AppHeader name={user.name} plan={user.plan} />
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black text-white">{fr ? "Paramètres du compte" : "Account settings"}</h1>
      <p className="mt-2 text-zinc-400">{user.email}</p>
      {message && <p role="status" className="mt-5 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan-100">{message}</p>}

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><UserRound /> {fr ? "Profil" : "Profile"}</h2>
        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <div><Label htmlFor="account-name">{fr ? "Nom" : "Name"}</Label><Input id="account-name" className="mt-2" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="account-language">{fr ? "Langue" : "Language"}</Label><select id="account-language" value={lang} onChange={(e) => setLang(e.target.value === "en" ? "en" : "fr")} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 text-sm"><option value="fr">Français</option><option value="en">English</option></select></div>
          <Button disabled={busy}><Save /> {fr ? "Enregistrer" : "Save"}</Button>
        </form>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound /> {fr ? "Sécurité" : "Security"}</h2>
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          <div><Label htmlFor="current-password">{fr ? "Mot de passe actuel" : "Current password"}</Label><Input id="current-password" type="password" autoComplete="current-password" className="mt-2" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
          <div><Label htmlFor="new-password">{fr ? "Nouveau mot de passe — 10 caractères minimum" : "New password — 10 characters minimum"}</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={10} className="mt-2" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
          <Button disabled={busy}>{fr ? "Modifier le mot de passe" : "Change password"}</Button>
        </form>
        <Button className="mt-4" variant="outline" disabled={busy} onClick={logoutAll}><LogOut /> {fr ? "Déconnecter les autres appareils" : "Sign out other devices"}</Button>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-bold">{fr ? "Données et confidentialité" : "Data and privacy"}</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/api/account" download><Button type="button" variant="outline"><Download /> {fr ? "Exporter mes données" : "Export my data"}</Button></a>
          <Button type="button" variant="destructive" disabled={busy} onClick={removeAccount}><Trash2 /> {fr ? "Supprimer mon compte" : "Delete my account"}</Button>
        </div>
      </Card>
    </main>
  </div>;
}
