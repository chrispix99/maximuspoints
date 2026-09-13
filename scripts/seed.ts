/**
 * Seed script: loads card data from the research JSON files into Postgres.
 * Thin CLI wrapper around lib/card-seed.ts (shared with the Vercel
 * bootstrap route).
 *
 * Reads (relative to the maximuspoints/ project directory):
 *   data/cards_premium.json
 *   data/cards_midtier.json
 *   data/cards_gapfill.json
 *
 * Run: npm run db:seed   (needs DATABASE_URL)
 * Run: npm run db:seed -- --dry-run   (validate files only, no DB needed)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../lib/db";
import { normalizeCardList, seedCards } from "../lib/card-seed";

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH_DIR = resolve(PROJECT_DIR, "data");
const INPUT_FILES = [
  "cards_premium.json",
  "cards_midtier.json",
  "cards_gapfill.json",
].map((f) => resolve(RESEARCH_DIR, f));

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !dryRun) {
    console.error(
      "ERROR: DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
    process.exit(1);
  }

  const found = INPUT_FILES.filter((f) => existsSync(f));
  const missing = INPUT_FILES.filter((f) => !existsSync(f));
  if (found.length === 0) {
    console.error(
      "ERROR: No card research files found. Expected at least one of:\n" +
        INPUT_FILES.map((f) => `  - ${f}`).join("\n"),
    );
    process.exit(1);
  }
  for (const f of missing) {
    console.warn(`WARN: research file not found, skipping: ${f}`);
  }

  const files = found.map((file) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      console.error(`ERROR: could not parse ${file}: ${(err as Error).message}`);
      process.exit(1);
    }
    if (Array.isArray(parsed)) {
      console.log(`Loaded ${parsed.length} cards from ${file}`);
    }
    return { label: file, parsed };
  });

  let cards;
  try {
    cards = normalizeCardList(files);
  } catch (err) {
    console.error(`ERROR: ${(err as Error).message}`);
    process.exit(1);
  }

  const totalPerks = cards.reduce((n, c) => n + c.perks.length, 0);
  console.log(`Seeding ${cards.length} unique cards (${totalPerks} perks)…`);
  if (dryRun) {
    const fees = cards.map((c) => c.annualFee / 100);
    console.log(
      `DRY RUN OK: ${cards.length} cards, fee range $${Math.min(...fees)}–$${Math.max(...fees)}.`,
    );
    for (const c of cards.slice(0, 5)) {
      console.log(`  $${c.annualFee / 100} — ${c.name} (${c.perks.length} perks)`);
    }
    console.log("Dry run complete — no database changes made.");
    return;
  }

  const result = await seedCards(getDb(), cards);
  for (const c of cards) {
    console.log(`  ✓ ${c.name} (${c.perks.length} perks)`);
  }
  console.log(`Done: ${result.cards} cards, ${result.perks} perks.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
