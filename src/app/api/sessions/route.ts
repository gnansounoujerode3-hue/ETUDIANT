import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { answers, courses, oralSessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canStartSession } from "@/lib/limits";

export const runtime = "nodejs";

// Démarre une session orale (entraînement ou examen).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { courseId?: string; mode?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const courseId = body.courseId ?? "";
  const mode = body.mode === "exam" ? "exam" : "practice";

  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id)))
    .limit(1);
  if (!owned[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const check = await canStartSession(user.id, user.plan, mode);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const [session] = await db
    .insert(oralSessions)
    .values({ userId: user.id, courseId, mode })
    .returning({ id: oralSessions.id });

  return NextResponse.json({ ok: true, oralSessionId: session.id });
}

// Termine une session : calcule le score moyen.
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { oralSessionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const sid = body.oralSessionId ?? "";

  const rows = await db
    .select({ id: oralSessions.id })
    .from(oralSessions)
    .where(and(eq(oralSessions.id, sid), eq(oralSessions.userId, user.id)))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const scores = await db
    .select({ score: answers.score })
    .from(answers)
    .where(eq(answers.oralSessionId, sid));
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)
    : null;

  await db
    .update(oralSessions)
    .set({ endedAt: new Date(), avgScore, answeredCount: scores.length })
    .where(eq(oralSessions.id, sid));

  return NextResponse.json({ ok: true, avgScore, answered: scores.length });
}
