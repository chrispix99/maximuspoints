/**
 * Applies Drizzle SQL migrations (./drizzle/*.sql) to DATABASE_URL.
 * Uses node-postgres directly since the neon-http driver is query-only
 * for migrations. Run: npm run db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "ERROR: DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle(pool);
  console.log("Applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: resolve(PROJECT_DIR, "drizzle") });
  console.log("Migrations applied.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
