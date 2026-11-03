import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { title?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 2 || title.length > 160) {
    return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  }

  const { id } = await context.params;
  const updated = await db
    .update(courses)
    .set({ title })
    .where(and(eq(courses.id, id), eq(courses.userId, user.id)))
    .returning({ id: courses.id, title: courses.title });

  if (!updated[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ course: updated[0] });
}

export async function DELETE(_req: NextRequest, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await db
    .delete(courses)
    .where(and(eq(courses.id, id), eq(courses.userId, user.id)))
    .returning({ id: courses.id });

  if (!deleted[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
