import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code ?? "database_error")
        : "database_error";
    console.error("Database health check failed", error);
    const cause =
      typeof error === "object" && error && "cause" in error
        ? (error as { cause?: unknown }).cause
        : undefined;
    const causeMessage = cause instanceof Error ? cause.message : "";
    const rawMessage = [error instanceof Error ? error.message : "Database connection failed", causeMessage]
      .filter(Boolean)
      .join(" | ");
    const message = rawMessage
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
      .replace(/password=[^\s]+/gi, "password=[redacted]")
      .slice(0, 240);
    return Response.json({ ok: false, code, message }, { status: 500 });
  }
}
