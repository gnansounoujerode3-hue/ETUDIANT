import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationUrl =
  process.env.DATABASE_DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!migrationUrl) {
  throw new Error("A PostgreSQL connection URL is required to run Drizzle commands");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
