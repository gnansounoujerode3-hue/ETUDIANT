import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SessionRoom } from "@/components/session-room";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ mode?: string; format?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { courseId } = await params;
  const sp = await searchParams;

  const rows = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.id)))
    .limit(1);
  const course = rows[0];
  if (!course) notFound();

  const mode = sp.mode === "exam" ? "exam" : "practice";
  return (
    <SessionRoom
      courseId={course.id}
      courseTitle={course.title}
      mode={mode}
      initialInputMode={sp.format === "written" ? "written" : "oral"}
      plan={user.plan}
    />
  );
}
