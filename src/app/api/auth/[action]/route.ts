import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issueAccountToken, sendAccountEmail } from "@/lib/account-email";
import {
  createSession,
  createAuthTicket,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ action: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function completeAuthentication(userId: string, embedded: boolean) {
  if (embedded) {
    const ticket = await createAuthTicket(userId);
    return NextResponse.json({
      ok: true,
      continueUrl: `/auth/continue?ticket=${encodeURIComponent(ticket)}`,
    });
  }
  await createSession(userId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  if (action === "google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: "google_not_configured" }, { status: 501 });
    }
    // Emplacement pour l'implémentation OAuth Google (Supabase Auth / Auth.js).
    return NextResponse.json({ error: "google_not_configured" }, { status: 501 });
  }

  if (action === "login" || action === "register") {
    const rule = action === "login"
      ? { name: "auth-login", limit: 10, windowSeconds: 15 * 60 }
      : { name: "auth-register", limit: 5, windowSeconds: 60 * 60 };
    const rate = await enforceRateLimit(req, rule);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
      );
    }
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    locale?: string;
    embedded?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (action === "register") {
    if (!EMAIL_RE.test(email) || password.length < 8) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: (body.name ?? "").trim() || null,
        passwordHash: hashPassword(password),
        locale: body.locale === "en" ? "en" : "fr",
      })
      .returning({ id: users.id });
    await db.insert(subscriptions).values({ userId: user.id, plan: "free" });
    const verificationToken = await issueAccountToken(user.id, "verify_email", 24 * 60);
    await sendAccountEmail({
      to: email,
      name: (body.name ?? "").trim() || null,
      kind: "verify_email",
      token: verificationToken,
      locale: body.locale === "en" ? "en" : "fr",
    }).catch(() => undefined);
    return completeAuthentication(user.id, body.embedded === true);
  }

  if (action === "login") {
    if (!EMAIL_RE.test(email) || !password) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "wrong" }, { status: 401 });
    }
    return completeAuthentication(user.id, body.embedded === true);
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { action } = await ctx.params;
  if (action === "me") {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}
