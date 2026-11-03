import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, flashcards } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { FlashcardsView, type FlashcardItem } from "@/components/flashcards-view";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { courseId } = await params;

  const courseRows = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id)))
    .limit(1);
  const course = courseRows[0];
  if (!course) notFound();

  const rows = await db
    .select({
      id: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
      chapterTitle: chapters.title,
    })
    .from(flashcards)
    .innerJoin(chapters, eq(flashcards.chapterId, chapters.id))
    .where(eq(flashcards.courseId, courseId));

  const cards: FlashcardItem[] = rows.map((r) => ({
    id: r.id,
    front: r.front,
    back: r.back,
    chapterTitle: r.chapterTitle,
  }));

  return (
    <div className="min-h-dvh">
      <AppHeader name={user.name} plan={user.plan} />
      <FlashcardsView courseId={course.id} courseTitle={course.title} cards={cards} />
    </div>
  );
}
