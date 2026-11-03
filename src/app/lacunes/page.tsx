import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { answers, chapters, courses, oralSessions, questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { GapsView, type ChapterStat, type WeakPoint } from "@/components/gaps-view";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function GapsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      chapterTitle: chapters.title,
      courseTitle: courses.title,
      score: answers.score,
      missing: answers.missingPoints,
    })
    .from(answers)
    .innerJoin(oralSessions, eq(answers.oralSessionId, oralSessions.id))
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(courses, eq(questions.courseId, courses.id))
    .where(eq(oralSessions.userId, user.id));

  // Score moyen par chapitre (cours + chapitre)
  const chapterAgg = new Map<string, { sum: number; n: number }>();
  const weakAgg = new Map<string, number>();

  for (const r of rows) {
    const key = `${r.courseTitle}|||${r.chapterTitle}`;
    const cur = chapterAgg.get(key) ?? { sum: 0, n: 0 };
    cur.sum += r.score;
    cur.n += 1;
    chapterAgg.set(key, cur);
    for (const m of r.missing ?? []) {
      const normalized = m.trim();
      if (normalized) weakAgg.set(normalized, (weakAgg.get(normalized) ?? 0) + 1);
    }
  }

  const chapterStats: ChapterStat[] = [...chapterAgg.entries()]
    .map(([key, agg]) => {
      const [courseTitle, chapterTitle] = key.split("|||");
      return {
        courseTitle,
        chapterTitle,
        avg: Math.round(agg.sum / agg.n),
        answered: agg.n,
      };
    })
    .sort((a, b) => a.avg - b.avg);

  const weakPoints: WeakPoint[] = [...weakAgg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  return (
    <div className="min-h-dvh">
      <AppHeader name={user.name} plan={user.plan} />
      <GapsView
        chapterStats={chapterStats}
        weakPoints={weakPoints}
        totalAnswers={rows.length}
        hasCourses={true}
      />
    </div>
  );
}
