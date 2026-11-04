import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  answers,
  courses,
  oralSessions,
  questionProgress,
  questions,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/ai";
import { detectCourseLanguage } from "@/lib/language";
import { sm2Update } from "@/lib/sm2";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Évalue une réponse orale : score /100, verdict, points manquants,
// puis met à jour la répétition espacée (SM-2 simplifié).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(
    req,
    { name: "evaluate", limit: user.plan === "premium" ? 500 : 60, windowSeconds: 60 * 60 },
    user.id
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: {
    oralSessionId?: string;
    questionId?: string;
    transcript?: string;
    responseMode?: "oral" | "written";
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { oralSessionId, questionId } = body;
  const transcript = (body.transcript ?? "").slice(0, 4000); // plafond coût IA
  if (!oralSessionId || !questionId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sessionRows = await db
    .select({
      id: oralSessions.id,
      courseId: oralSessions.courseId,
      endedAt: oralSessions.endedAt,
    })
    .from(oralSessions)
    .where(and(eq(oralSessions.id, oralSessionId), eq(oralSessions.userId, user.id)))
    .limit(1);
  const oralSession = sessionRows[0];
  if (!oralSession) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (oralSession.endedAt) {
    return NextResponse.json({ error: "session_ended" }, { status: 409 });
  }

  const questionRows = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      modelAnswer: questions.modelAnswer,
      keyPoints: questions.keyPoints,
      courseTitle: courses.title,
      courseRawText: courses.rawText,
    })
    .from(questions)
    .innerJoin(courses, eq(questions.courseId, courses.id))
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.courseId, oralSession.courseId),
        eq(courses.userId, user.id)
      )
    )
    .limit(1);
  const question = questionRows[0];
  if (!question) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // La langue du feedback doit suivre le cours, pas la langue enregistrée dans
  // le profil. Sinon un cours français pouvait produire une évaluation anglaise.
  const evaluationLanguage = detectCourseLanguage(
    // Le texte source complet est nécessaire : certaines questions très
    // courtes (« Donne un exemple… ») sont ambiguës isolément et retombaient
    // encore sur la langue anglaise du profil.
    question.courseRawText ||
      `${question.prompt}\n${question.modelAnswer}\n${question.keyPoints.join(" ")}`,
    user.locale === "en" ? "en" : "fr"
  );
  const evaluation = await evaluateAnswer({
    question: question.prompt,
    modelAnswer: question.modelAnswer,
    keyPoints: question.keyPoints,
    transcript,
    courseTitle: question.courseTitle,
    lang: evaluationLanguage,
  });

  // --- SM-2 ---
  const existing = await db
    .select()
    .from(questionProgress)
    .where(and(eq(questionProgress.userId, user.id), eq(questionProgress.questionId, questionId)))
    .limit(1);
  const prev = existing[0];
  const updated = sm2Update(prev ?? null, evaluation.score);
  if (prev) {
    await db
      .update(questionProgress)
      .set({
        easiness: updated.easiness,
        intervalDays: updated.intervalDays,
        repetitions: updated.repetitions,
        lapses: updated.lapses,
        lastScore: evaluation.score,
        nextDueAt: updated.nextDueAt,
        updatedAt: new Date(),
      })
      .where(eq(questionProgress.id, prev.id));
  } else {
    await db.insert(questionProgress).values({
      userId: user.id,
      questionId,
      easiness: updated.easiness,
      intervalDays: updated.intervalDays,
      repetitions: updated.repetitions,
      lapses: updated.lapses,
      lastScore: evaluation.score,
      nextDueAt: updated.nextDueAt,
    });
  }

  await db.insert(answers).values({
    oralSessionId,
    questionId,
    transcript,
    responseMode: body.responseMode === "written" ? "written" : "oral",
    score: evaluation.score,
    verdict: evaluation.verdict,
    feedback: evaluation.feedback,
    missingPoints: evaluation.missing,
  });

  // Met à jour les agrégats de la session
  const scores = await db
    .select({ score: answers.score })
    .from(answers)
    .where(eq(answers.oralSessionId, oralSessionId));
  const avgScore = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
  await db
    .update(oralSessions)
    .set({ avgScore, answeredCount: scores.length })
    .where(eq(oralSessions.id, oralSessionId));

  return NextResponse.json({ ...evaluation, modelAnswer: question.modelAnswer });
}
