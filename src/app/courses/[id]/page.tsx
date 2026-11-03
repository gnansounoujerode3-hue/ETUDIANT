import { notFound, redirect } from "next/navigation";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, flashcards, questionProgress, questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CourseView, type CourseChapter } from "@/components/course-view";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, user.id)))
    .limit(1);
  const course = rows[0];
  if (!course) notFound();

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, id))
    .orderBy(asc(chapters.order));

  const qCounts = await db
    .select({ chapterId: questions.chapterId, n: count() })
    .from(questions)
    .where(eq(questions.courseId, id))
    .groupBy(questions.chapterId);
  const qMap = new Map(qCounts.map((r) => [r.chapterId, r.n]));

  const fc = await db
    .select({ n: count() })
    .from(flashcards)
    .where(eq(flashcards.courseId, id));

  const progress = await db
    .select({ lastScore: questionProgress.lastScore })
    .from(questionProgress)
    .innerJoin(questions, eq(questionProgress.questionId, questions.id))
    .where(and(eq(questionProgress.userId, user.id), eq(questions.courseId, id)));
  const scored = progress.filter((p) => p.lastScore != null);
  const mastery = scored.length
    ? Math.round(scored.reduce((a, b) => a + (b.lastScore ?? 0), 0) / scored.length)
    : null;

  const chapterList: CourseChapter[] = chapterRows.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    keyConcepts: c.keyConcepts,
    questionCount: qMap.get(c.id) ?? 0,
  }));

  return (
    <CourseView
      course={{ id: course.id, title: course.title, sourceName: course.sourceName }}
      chapters={chapterList}
      flashcardCount={fc[0]?.n ?? 0}
      mastery={mastery}
      plan={user.plan}
      userName={user.name}
    />
  );
}
