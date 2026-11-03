import { db } from "@/db";
import { courses, oralSessions } from "@/db/schema";
import { and, count, eq, gte } from "drizzle-orm";
import { startOfISOWeek } from "./utils";
import { FREE_LIMITS, type Plan } from "./plans";

export { FREE_LIMITS };
export type { Plan };

export async function countUserCourses(userId: string) {
  const rows = await db
    .select({ n: count() })
    .from(courses)
    .where(eq(courses.userId, userId));
  return rows[0]?.n ?? 0;
}

export async function countSessionsThisWeek(userId: string) {
  const since = startOfISOWeek();
  const rows = await db
    .select({ n: count() })
    .from(oralSessions)
    .where(and(eq(oralSessions.userId, userId), gte(oralSessions.startedAt, since)));
  return rows[0]?.n ?? 0;
}

/** Vérifie qu'un utilisateur peut créer un cours (limite gratuite : 1). */
export async function canCreateCourse(userId: string, plan: Plan) {
  if (plan === "premium") return { ok: true as const };
  const n = await countUserCourses(userId);
  if (n >= FREE_LIMITS.maxCourses)
    return { ok: false as const, reason: "course_limit" as const };
  return { ok: true as const };
}

/** Vérifie qu'un utilisateur peut démarrer une session orale. */
export async function canStartSession(userId: string, plan: Plan, mode: string) {
  if (mode === "exam" && plan !== "premium")
    return { ok: false as const, reason: "exam_premium" as const };
  if (plan === "premium") return { ok: true as const, usedThisWeek: 0 };
  const used = await countSessionsThisWeek(userId);
  if (used >= FREE_LIMITS.sessionsPerWeek)
    return { ok: false as const, reason: "session_limit" as const, usedThisWeek: used };
  return { ok: true as const, usedThisWeek: used };
}
