import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

const BASE_COUNT = 12480; // comptes avant cette instance (preuve sociale)

export async function GET() {
  try {
    const rows = await db.select({ n: count() }).from(users);
    return NextResponse.json({ students: BASE_COUNT + (rows[0]?.n ?? 0) });
  } catch {
    return NextResponse.json({ students: BASE_COUNT });
  }
}
