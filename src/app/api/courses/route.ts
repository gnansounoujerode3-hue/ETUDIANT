import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, flashcards, questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { structureCourse } from "@/lib/ai";
import { detectCourseLanguage } from "@/lib/language";
import { canCreateCourse } from "@/lib/limits";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RAW_CHARS = 120_000; // plafond coût IA côté serveur

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, user.id))
    .orderBy(desc(courses.createdAt));
  return NextResponse.json({ courses: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(
    req,
    { name: "course-create", limit: user.plan === "premium" ? 30 : 3, windowSeconds: 24 * 60 * 60 },
    user.id
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: { title?: string; sourceName?: string; text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (text.length < 200) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  const check = await canCreateCourse(user.id, user.plan);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const rawText = text.slice(0, MAX_RAW_CHARS);
  // La langue des questions suit le document importé. La langue du profil ne
  // sert que de solution de repli pour un texte trop court ou ambigu.
  const lang = detectCourseLanguage(rawText, user.locale === "en" ? "en" : "fr");
  const structured = await structureCourse(
    rawText,
    body.sourceName || body.title || "cours",
    lang
  );
  if (!structured.chapters.length) {
    return NextResponse.json({ error: "structure_failed" }, { status: 422 });
  }

  const title = (body.title ?? "").trim() || structured.title;

  const [course] = await db
    .insert(courses)
    .values({ userId: user.id, title, sourceName: body.sourceName ?? null, rawText })
    .returning({ id: courses.id });

  try {
    let questionCount = 0;
    let flashcardCount = 0;
    for (const [i, ch] of structured.chapters.entries()) {
      const [chapter] = await db
        .insert(chapters)
        .values({
          courseId: course.id,
          order: i,
          title: ch.title,
          summary: ch.summary,
          keyConcepts: ch.keyConcepts,
        })
        .returning({ id: chapters.id });
      if (ch.questions.length) {
        await db.insert(questions).values(
          ch.questions.map((q) => ({
            courseId: course.id,
            chapterId: chapter.id,
            type: q.type,
            difficulty: q.difficulty,
            prompt: q.prompt,
            modelAnswer: q.modelAnswer,
            keyPoints: q.keyPoints,
          }))
        );
        questionCount += ch.questions.length;
      }
      if (ch.flashcards.length) {
        await db.insert(flashcards).values(
          ch.flashcards.map((f) => ({
            courseId: course.id,
            chapterId: chapter.id,
            front: f.front,
            back: f.back,
          }))
        );
        flashcardCount += ch.flashcards.length;
      }
    }
    return NextResponse.json({
      ok: true,
      courseId: course.id,
      stats: {
        chapters: structured.chapters.length,
        questions: questionCount,
        flashcards: flashcardCount,
      },
    });
  } catch (e) {
    // rollback souple si l'insertion du contenu échoue
    await db.delete(courses).where(eq(courses.id, course.id));
    throw e;
  }
}
