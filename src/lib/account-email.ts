import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountTokens } from "@/db/schema";

export type AccountTokenType = "verify_email" | "reset_password";

export function hashAccountToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccountToken(userId: string, type: AccountTokenType, lifetimeMinutes: number) {
  await db.delete(accountTokens).where(and(eq(accountTokens.userId, userId), eq(accountTokens.type, type)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(accountTokens).values({
    tokenHash: hashAccountToken(token),
    userId,
    type,
    expiresAt: new Date(Date.now() + lifetimeMinutes * 60 * 1000),
  });
  return token;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}

export async function sendAccountEmail(input: { to: string; name?: string | null; kind: AccountTokenType; token: string; locale?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  // Mode bêta sans fournisseur : l'inscription reste disponible, mais les
  // fonctions dépendant d'un email signalent simplement qu'aucun message
  // n'a été envoyé. Cela évite de bloquer les premiers testeurs.
  if ((!resendKey && !brevoKey) || !from || !baseUrl) {
    return { sent: false as const, provider: null };
  }

  const fr = input.locale !== "en";
  const path = input.kind === "verify_email" ? "/verify-email" : "/reset-password";
  const url = `${baseUrl.replace(/\/$/, "")}${path}?token=${encodeURIComponent(input.token)}`;
  const title = input.kind === "verify_email"
    ? (fr ? "Confirme ton adresse email" : "Confirm your email address")
    : (fr ? "Réinitialise ton mot de passe" : "Reset your password");
  const action = input.kind === "verify_email"
    ? (fr ? "Confirmer mon adresse" : "Confirm my email")
    : (fr ? "Choisir un nouveau mot de passe" : "Choose a new password");
  const expiry = input.kind === "verify_email" ? (fr ? "24 heures" : "24 hours") : (fr ? "30 minutes" : "30 minutes");
  const greeting = input.name ? `${fr ? "Bonjour" : "Hello"} ${escapeHtml(input.name)},` : (fr ? "Bonjour," : "Hello,");

  const subject = `Voxa — ${title}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18181b"><h1>Voxa</h1><p>${greeting}</p><p>${title}.</p><p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#7c3aed;color:white;text-decoration:none">${action}</a></p><p style="color:#71717a">${fr ? "Ce lien expire dans" : "This link expires in"} ${expiry}. ${fr ? "Si tu n’es pas à l’origine de cette demande, ignore cet email." : "If you did not request this, ignore this email."}</p></div>`;

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject, html }),
    });
    if (!res.ok) throw new Error(`Resend failed with status ${res.status}`);
    return { sent: true as const, provider: "resend" as const };
  }

  // Brevo accepte temporairement une adresse d'expéditeur individuelle
  // vérifiée, ce qui permet une bêta publique avant l'achat d'un domaine.
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const sender = match
    ? { name: match[1] || "Voxa", email: match[2] }
    : { name: "Voxa", email: from };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey!, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: input.to }], subject, htmlContent: html }),
  });
  if (!res.ok) throw new Error(`Brevo failed with status ${res.status}`);
  return { sent: true as const, provider: "brevo" as const };
}
