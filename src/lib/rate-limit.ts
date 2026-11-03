import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { pool } from "@/db";

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

function requestAddress(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Fixed-window limiter persisted in PostgreSQL so all serverless instances
 * enforce the same counter. Identifiers are hashed before storage.
 */
export async function enforceRateLimit(
  req: NextRequest,
  rule: RateLimitRule,
  identity?: string
): Promise<RateLimitResult> {
  const subject = identity || requestAddress(req);
  const key = `${rule.name}:${digest(subject)}`;
  const windowMs = rule.windowSeconds * 1000;
  const resetAt = new Date(Date.now() + windowMs);

  const result = await pool.query<{ count: number; reset_at: Date }>(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE
         WHEN rate_limits.reset_at <= NOW() THEN 1
         ELSE rate_limits.count + 1
       END,
       reset_at = CASE
         WHEN rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at
         ELSE rate_limits.reset_at
       END
     RETURNING count, reset_at`,
    [key, resetAt]
  );

  const row = result.rows[0];
  const count = row?.count ?? rule.limit + 1;
  const retryAfter = Math.max(1, Math.ceil(((row?.reset_at?.getTime() ?? resetAt.getTime()) - Date.now()) / 1000));
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfter,
  };
}
