import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accountTokens, authSessions, users } from "@/db/schema";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashAccountToken, issueAccountToken, sendAccountEmail } from "@/lib/account-email";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest, context: Context) {
  const { action } = await context.params;
  let body: { email?: unknown; token?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  if (action === "request-reset") {
    const rate = await enforceRateLimit(req, { name: "password-reset-request", limit: 5, windowSeconds: 60 * 60 });
    if (!rate.allowed) return NextResponse.json({ ok: true });
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (EMAIL_RE.test(email)) {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];
      if (user?.passwordHash) {
        const token = await issueAccountToken(user.id, "reset_password", 30);
        await sendAccountEmail({ to: user.email, name: user.name, kind: "reset_password", token, locale: user.locale }).catch(() => undefined);
      }
    }
    // Réponse identique pour empêcher l’énumération des comptes.
    return NextResponse.json({ ok: true });
  }

  if (action === "resend-verification") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const rate = await enforceRateLimit(req, { name: "email-verification", limit: 3, windowSeconds: 60 * 60 }, user.id);
    if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const record = rows[0];
    if (!record || record.emailVerifiedAt) return NextResponse.json({ ok: true });
    const token = await issueAccountToken(user.id, "verify_email", 24 * 60);
    const result = await sendAccountEmail({ to: user.email, name: user.name, kind: "verify_email", token, locale: user.locale });
    return NextResponse.json({ ok: true, sent: result.sent });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (token.length < 20) return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  const tokenHash = hashAccountToken(token);

  if (action === "verify-email") {
    const rows = await db.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, tokenHash), eq(accountTokens.type, "verify_email"), gt(accountTokens.expiresAt, new Date()), isNull(accountTokens.usedAt))).limit(1);
    const record = rows[0];
    if (!record) return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
    await db.transaction(async (tx) => {
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, record.userId));
      await tx.update(accountTokens).set({ usedAt: new Date() }).where(eq(accountTokens.tokenHash, tokenHash));
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset-password") {
    const rate = await enforceRateLimit(req, { name: "password-reset-submit", limit: 10, windowSeconds: 60 * 60 });
    if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 10 || password.length > 200) return NextResponse.json({ error: "weak_password" }, { status: 400 });
    const rows = await db.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, tokenHash), eq(accountTokens.type, "reset_password"), gt(accountTokens.expiresAt, new Date()), isNull(accountTokens.usedAt))).limit(1);
    const record = rows[0];
    if (!record) return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, record.userId));
      await tx.update(accountTokens).set({ usedAt: new Date() }).where(eq(accountTokens.tokenHash, tokenHash));
      await tx.delete(authSessions).where(eq(authSessions.userId, record.userId));
    });
    await createSession(record.userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}
