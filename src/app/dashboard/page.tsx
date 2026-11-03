import { redirect } from "next/navigation";
import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, questionProgress, questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { countSessionsThisWeek } from "@/lib/limits";
import { DashboardView, type DashboardCourse } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const courseRows = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, user.id))
    .orderBy(desc(courses.createdAt));

  const ids = courseRows.map((c) => c.id);
  const questionCounts = new Map<string, number>();
  const chapterCounts = new Map<string, number>();
  const masterySum = new Map<string, { sum: number; n: number }>();

  if (ids.length) {
    const qc = await db
      .select({ courseId: questions.courseId, n: count() })
      .from(questions)
      .where(inArray(questions.courseId, ids))
      .groupBy(questions.courseId);
    qc.forEach((r) => questionCounts.set(r.courseId, r.n));

    const cc = await db
      .select({ courseId: chapters.courseId, n: count() })
      .from(chapters)
      .where(inArray(chapters.courseId, ids))
      .groupBy(chapters.courseId);
    cc.forEach((r) => chapterCounts.set(r.courseId, r.n));

    const progress = await db
      .select({ courseId: questions.courseId, lastScore: questionProgress.lastScore })
      .from(questionProgress)
      .innerJoin(questions, eq(questionProgress.questionId, questions.id))
      .where(eq(questionProgress.userId, user.id));
    for (const p of progress) {
      if (p.lastScore == null) continue;
      const cur = masterySum.get(p.courseId) ?? { sum: 0, n: 0 };
      cur.sum += p.lastScore;
      cur.n += 1;
      masterySum.set(p.courseId, cur);
    }
  }

  const list: DashboardCourse[] = courseRows.map((c) => {
    const m = masterySum.get(c.id);
    return {
      id: c.id,
      title: c.title,
      sourceName: c.sourceName,
      createdAt: c.createdAt.toISOString(),
      questionCount: questionCounts.get(c.id) ?? 0,
      chapterCount: chapterCounts.get(c.id) ?? 0,
      mastery: m && m.n > 0 ? Math.round(m.sum / m.n) : null,
    };
  });

  const sessionsThisWeek = await countSessionsThisWeek(user.id);

  return (
    <DashboardView
      name={user.name}
      plan={user.plan}
      courses={list}
      sessionsThisWeek={sessionsThisWeek}
    />
  );
}
