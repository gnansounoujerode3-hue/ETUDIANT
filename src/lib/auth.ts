import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, authTickets, subscriptions, users } from "@/db/schema";

export const SESSION_COOKIE = "voxa_session";
const SESSION_DAYS = 30;

// ---------------------------------------------------------------------------
// Mots de passe (scrypt — pas de dépendance externe)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---------------------------------------------------------------------------
// Sessions (cookie httpOnly -> table auth_sessions)
// ---------------------------------------------------------------------------
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ token, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // "none" + secure : nécessaire pour que la session survive quand l'app est
    // embarquée dans une iframe de prévisualisation (contexte cross-site).
    sameSite: "none",
    secure: true,
    expires: expiresAt,
    path: "/",
  });
}

// Ticket de connexion one-shot (5 min) : permet de transférer une connexion
// depuis une iframe Safari vers un onglet first-party sans exposer le cookie.
export async function createAuthTicket(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(authTickets).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return token;
}

export async function consumeAuthTicket(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  // DELETE ... RETURNING rend la consommation atomique : le ticket ne peut
  // être utilisé qu'une fois, même lors de requêtes concurrentes.
  const rows = await db
    .delete(authTickets)
    .where(and(eq(authTickets.token, token), gt(authTickets.expiresAt, new Date())))
    .returning({ userId: authTickets.userId });
  return rows[0]?.userId ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(authSessions).where(eq(authSessions.token, token));
  store.delete(SESSION_COOKIE);
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  plan: "free" | "premium";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      locale: users.locale,
      plan: subscriptions.plan,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    locale: row.locale,
    plan: row.plan === "premium" ? "premium" : "free",
  };
}
