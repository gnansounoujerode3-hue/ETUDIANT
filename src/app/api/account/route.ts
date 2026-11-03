import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  answers,
  authSessions,
  chapters,
  courses,
  flashcards,
  oralSessions,
  questionProgress,
  questions,
  subscriptions,
  users,
} from "@/db/schema";
import { createSession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function storedUser(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(req, { name: "account-update", limit: 20, windowSeconds: 60 * 60 }, user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  let body: { action?: string; name?: unknown; locale?: unknown; currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.action === "profile") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length > 100) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    const locale = body.locale === "en" ? "en" : "fr";
    await db.update(users).set({ name: name || null, locale }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "password") {
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 10 || newPassword.length > 200) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }
    const record = await storedUser(user.id);
    if (!record?.passwordHash || !verifyPassword(currentPassword, record.passwordHash)) {
      return NextResponse.json({ error: "wrong_password" }, { status: 401 });
    }
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
      await tx.delete(authSessions).where(eq(authSessions.userId, user.id));
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "logout_all") {
    await db.delete(authSessions).where(eq(authSessions.userId, user.id));
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(req, { name: "account-export", limit: 3, windowSeconds: 24 * 60 * 60 }, user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }

  const [account, plan, userCourses, userSessions, progress] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, locale: users.locale, createdAt: users.createdAt }).from(users).where(eq(users.id, user.id)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(courses).where(eq(courses.userId, user.id)),
    db.select().from(oralSessions).where(eq(oralSessions.userId, user.id)),
    db.select().from(questionProgress).where(eq(questionProgress.userId, user.id)),
  ]);

  const courseIds = userCourses.map((course) => course.id);
  const sessionIds = userSessions.map((session) => session.id);
  const allChapters = courseIds.length ? (await Promise.all(courseIds.map((id) => db.select().from(chapters).where(eq(chapters.courseId, id))))).flat() : [];
  const allQuestions = courseIds.length ? (await Promise.all(courseIds.map((id) => db.select().from(questions).where(eq(questions.courseId, id))))).flat() : [];
  const allFlashcards = courseIds.length ? (await Promise.all(courseIds.map((id) => db.select().from(flashcards).where(eq(flashcards.courseId, id))))).flat() : [];
  const allAnswers = sessionIds.length ? (await Promise.all(sessionIds.map((id) => db.select().from(answers).where(eq(answers.oralSessionId, id))))).flat() : [];

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    account: account[0] ?? null,
    subscription: plan[0] ?? null,
    courses: userCourses,
    chapters: allChapters,
    questions: allQuestions,
    flashcards: allFlashcards,
    oralSessions: userSessions,
    answers: allAnswers,
    questionProgress: progress,
  }, { headers: { "Content-Disposition": `attachment; filename="voxa-export-${user.id}.json"` } });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(req, { name: "account-delete", limit: 5, windowSeconds: 60 * 60 }, user.id);
  if (!rate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  const record = await storedUser(user.id);
  if (!record?.passwordHash || !verifyPassword(password, record.passwordHash)) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  await db.delete(users).where(eq(users.id, user.id));
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("voxa_session");
  return response;
}
