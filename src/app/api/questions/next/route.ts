import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, questionProgress, questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const EXAM_QUESTION_COUNT = 10;

// Sélectionne la prochaine question : les points faibles (échus / mal notés)
// reviennent en premier, puis les nouvelles questions par difficulté croissante.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    courseId?: string;
    oralSessionId?: string;
    askedIds?: string[];
    mode?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const courseId = body.courseId ?? "";
  const asked = new Set(Array.isArray(body.askedIds) ? body.askedIds : []);
  const mode = body.mode === "exam" ? "exam" : "practice";

  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id)))
    .limit(1);
  if (!owned[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (mode === "exam" && asked.size >= EXAM_QUESTION_COUNT) {
    return NextResponse.json({ done: true });
  }

  const qs = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      type: questions.type,
      difficulty: questions.difficulty,
      chapterTitle: chapters.title,
    })
    .from(questions)
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(eq(questions.courseId, courseId))
    .orderBy(asc(questions.difficulty));

  const progressRows = await db
    .select()
    .from(questionProgress)
    .where(eq(questionProgress.userId, user.id));
  const progressMap = new Map(progressRows.map((p) => [p.questionId, p]));

  const now = Date.now();
  const candidates = qs
    .filter((q) => !asked.has(q.id))
    .map((q) => {
      const p = progressMap.get(q.id);
      const due = !p || p.nextDueAt.getTime() <= now;
      return { q, lastScore: p?.lastScore ?? null, due, fresh: !p };
    });

  // 1) questions échues (ratées ou jamais réussies) — les plus faibles d'abord
  const dueWeak = candidates
    .filter((c) => c.due && !c.fresh)
    .sort((a, b) => (a.lastScore ?? 0) - (b.lastScore ?? 0) || a.q.difficulty - b.q.difficulty);
  // 2) nouvelles questions, difficulté croissante
  const fresh = candidates
    .filter((c) => c.fresh)
    .sort((a, b) => a.q.difficulty - b.q.difficulty);
  // 3) pas encore échues (fin de session)
  const notDue = candidates.filter((c) => !c.due).sort((a, b) => a.q.difficulty - b.q.difficulty);

  const ordered = [...dueWeak, ...fresh, ...notDue];
  const next = ordered[0];

  if (!next) return NextResponse.json({ done: true });

  return NextResponse.json({
    done: false,
    question: {
      id: next.q.id,
      prompt: next.q.prompt,
      type: next.q.type,
      difficulty: next.q.difficulty,
      chapterTitle: next.q.chapterTitle,
      index: asked.size + 1,
      total: mode === "exam" ? Math.min(EXAM_QUESTION_COUNT, qs.length) : qs.length,
    },
  });
}
