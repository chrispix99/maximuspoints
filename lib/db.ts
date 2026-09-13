import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL ?? "";

function createDb() {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Lazily created so `next build` and scripts that don't touch the DB
// never crash when DATABASE_URL is unset.
let cached: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  if (!cached) cached = createDb();
  return cached;
}

export type Db = ReturnType<typeof getDb>;
