import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Vercel's Supabase integration exposes POSTGRES_URL automatically.
// DATABASE_URL remains supported for local development and other hosts.
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("POSTGRES_URL or DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const isSupabase = /(?:supabase\.co|pooler\.supabase\.com)/i.test(databaseUrl);
let connectionString = databaseUrl;
if (isSupabase) {
  // Supabase's managed pooler presents a certificate chain that is encrypted
  // but is not rooted in the CA bundle available in every Vercel runtime.
  // Remove URL-level sslmode so the explicit TLS configuration below wins.
  const parsed = new URL(databaseUrl);
  parsed.searchParams.delete("sslmode");
  connectionString = parsed.toString();
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
