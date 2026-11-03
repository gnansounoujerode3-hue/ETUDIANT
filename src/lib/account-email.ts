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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !baseUrl) {
    if (process.env.NODE_ENV === "production") throw new Error("Email service is not configured");
    return { sent: false as const };
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Voxa — ${title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18181b"><h1>Voxa</h1><p>${greeting}</p><p>${title}.</p><p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#7c3aed;color:white;text-decoration:none">${action}</a></p><p style="color:#71717a">${fr ? "Ce lien expire dans" : "This link expires in"} ${expiry}. ${fr ? "Si tu n’es pas à l’origine de cette demande, ignore cet email." : "If you did not request this, ignore this email."}</p></div>`,
    }),
  });
  if (!res.ok) throw new Error(`Email provider failed with status ${res.status}`);
  return { sent: true as const };
}
