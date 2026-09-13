/**
 * Seed script: loads card data from the research JSON files into Postgres.
 *
 * Reads (relative to the maximuspoints/ project directory):
 *   ../maximuspoints-research/cards_premium.json
 *   ../maximuspoints-research/cards_midtier.json
 *   ../maximuspoints-research/cards_gapfill.json
 *
 * Each file may be either a bare JSON array of cards or an object shaped
 * {"cards": [...]}.
 *
 * Expected JSON shape — an array of card objects:
 *
 *   [
 *     {
 *       "name": "Chase Sapphire Reserve",
 *       "issuer": "Chase",
 *       "network": "Visa",                       // optional
 *       "annualFee": 550,                        // dollars (see note)
 *       "annualFeeCents": 55000,                 // optional, wins if present
 *       "foreignTransactionFee": false,          // optional, default false
 *       "multipliers": {                          // points per dollar
 *         "dining": 3, "groceries": 1, "gas": 1,
 *         "travel": 3, "flights": 5, "hotels": 5,
 *         "everyday": 1, "alaska_airlines": 1
 *       },
 *       "perks": [
 *         { "name": "$300 travel credit", "amount": 300,   // dollars (see note)
 *           "amountCents": 30000,                          // optional, wins
 *           "cadence": "annual",                           // monthly|quarterly|semiannual|annual
 *           "details": "…" }                               // optional
 *       ],
 *       "sources": ["https://…"]                  // optional source URLs
 *     }
 *   ]
 *
 * Money note: "annualFee"/"amount" are interpreted as DOLLARS and converted
 * to cents. If a value is >= 1000 it is assumed to already be cents (a
 * defensive heuristic — prefer explicit *Cents fields or dollar values).
 *
 * Behavior: merges both files, dedupes by card name (case-insensitive,
 * first occurrence wins), sorts by annual fee desc, then upserts cards by
 * name and replaces each card's perks.
 *
 * Run: npm run db:seed   (needs DATABASE_URL)
 * Run: npm run db:seed -- --dry-run   (validate files only, no DB needed)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import type { CardMultipliers, PerkCadence } from "../drizzle/schema";

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH_DIR = resolve(PROJECT_DIR, "..", "maximuspoints-research");
const INPUT_FILES = [
  "cards_premium.json",
  "cards_midtier.json",
  "cards_gapfill.json",
].map((f) => resolve(RESEARCH_DIR, f));

const CADENCES = ["monthly", "quarterly", "semiannual", "annual"] as const;
const MULT_KEYS = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "flights",
  "hotels",
  "everyday",
  "alaska_airlines",
] as const;

interface RawPerk {
  name?: unknown;
  amount?: unknown;
  amountCents?: unknown;
  cadence?: unknown;
  details?: unknown;
}

interface RawCard {
  name?: unknown;
  issuer?: unknown;
  network?: unknown;
  annualFee?: unknown;
  annual_fee?: unknown;
  annualFeeCents?: unknown;
  foreignTransactionFee?: unknown;
  foreign_transaction_fee?: unknown;
  multipliers?: unknown;
  perks?: unknown;
  benefits?: unknown; // alias used by some research files
  sources?: unknown;
}

/** Dollars → cents, with a defensive heuristic for values that already
 *  look like cents. */
function toCents(value: unknown, explicitCents: unknown, field: string): number {
  if (typeof explicitCents === "number" && Number.isFinite(explicitCents)) {
    return Math.round(explicitCents);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Card field "${field}" must be a number (dollars).`);
  }
  if (value >= 1000) return Math.round(value); // already cents, probably
  return Math.round(value * 100);
}

function normalizeCadence(value: unknown, cardName: string): PerkCadence {
  const v = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const mapped = v === "semiannual" ? "semiannual" : v; // "semi-annual" → "semiannual"
  if ((CADENCES as readonly string[]).includes(mapped)) {
    return mapped as PerkCadence;
  }
  throw new Error(
    `Card "${cardName}": perk cadence "${value}" is invalid. ` +
      `Expected one of: ${CADENCES.join(", ")}.`,
  );
}

function normalizeMultipliers(raw: unknown): CardMultipliers {
  const out: CardMultipliers = {};
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    // Accept snake_case (canonical) and camelCase aliases.
    const alias: Record<string, string> = { alaskaAirlines: "alaska_airlines" };
    for (const key of MULT_KEYS) out[key] = 0;
    for (const [k, v] of Object.entries(r)) {
      const key = alias[k] ?? k;
      if (
        (MULT_KEYS as readonly string[]).includes(key) &&
        typeof v === "number" &&
        Number.isFinite(v) &&
        v > 0
      ) {
        (out as Record<string, number>)[key] = v;
      }
    }
  }
  return out;
}

function normalizeCard(raw: RawCard, index: number): {
  name: string;
  issuer: string;
  network: string | null;
  annualFee: number;
  foreignTransactionFee: boolean;
  multipliers: CardMultipliers;
  perks: {
    name: string;
    amountCents: number;
    cadence: PerkCadence;
    details: string | null;
  }[];
  sources: string[];
} {
  const name = String(raw.name ?? "").trim();
  if (!name) throw new Error(`Card at index ${index} is missing "name".`);
  const issuer = String(raw.issuer ?? "").trim();
  if (!issuer) throw new Error(`Card "${name}" is missing "issuer".`);

  const perksRaw = (
    Array.isArray(raw.perks)
      ? (raw.perks as RawPerk[])
      : Array.isArray(raw.benefits)
        ? (raw.benefits as RawPerk[])
        : []
  );
  const perks = perksRaw.map((p, i) => {
    const perkName = String(p.name ?? "").trim();
    if (!perkName)
      throw new Error(`Card "${name}": perk at index ${i} is missing "name".`);
    return {
      name: perkName,
      amountCents: toCents(p.amount, p.amountCents, `perks[${i}].amount`),
      cadence: normalizeCadence(p.cadence, name),
      details:
        p.details === undefined || p.details === null
          ? null
          : String(p.details),
    };
  });

  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter((s): s is string => typeof s === "string")
    : [];

  return {
    name,
    issuer,
    network:
      raw.network === undefined || raw.network === null
        ? null
        : String(raw.network),
    annualFee: toCents(
      raw.annualFee ?? raw.annual_fee,
      raw.annualFeeCents,
      "annualFee",
    ),
    foreignTransactionFee:
      raw.foreignTransactionFee === true ||
      raw.foreign_transaction_fee === true,
    multipliers: normalizeMultipliers(raw.multipliers),
    perks,
    sources,
  };
}

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
        INPUT_FILES.map((f) => `  - ${f}`).join("\n") +
        "\n\nThese JSON files are produced by the card research step. " +
        "See the seed script header / README for the expected format.",
    );
    process.exit(1);
  }
  for (const f of missing) {
    console.warn(`WARN: research file not found, skipping: ${f}`);
  }

  // Merge + dedupe by name (case-insensitive, first file wins).
  const seen = new Map<string, ReturnType<typeof normalizeCard>>();
  for (const file of found) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      console.error(`ERROR: could not parse ${file}: ${(err as Error).message}`);
      process.exit(1);
    }
    if (!Array.isArray(parsed)) {
      // Also accept {"cards": [...]} shape used by the research files.
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { cards?: unknown }).cards)
      ) {
        parsed = (parsed as { cards: unknown[] }).cards;
      } else {
        console.error(
          `ERROR: ${file} must contain a JSON array of cards or {"cards": [...]}.`,
        );
        process.exit(1);
      }
    }
    console.log(`Loaded ${(parsed as unknown[]).length} cards from ${file}`);
    (parsed as RawCard[]).forEach((raw, i) => {
      let card;
      try {
        card = normalizeCard(raw, i);
      } catch (err) {
        console.error(
          `ERROR in ${file} card index ${i}: ${(err as Error).message}`,
        );
        process.exit(1);
      }
      const key = card.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, card);
      else console.warn(`WARN: duplicate card name "${card.name}", skipping.`);
    });
  }

  const cardsSorted = [...seen.values()].sort(
    (a, b) => b.annualFee - a.annualFee,
  );
  const totalPerks = cardsSorted.reduce((n, c) => n + c.perks.length, 0);
  console.log(
    `Seeding ${cardsSorted.length} unique cards (${totalPerks} perks)…`,
  );
  if (dryRun) {
    const fees = cardsSorted.map((c) => c.annualFee / 100);
    console.log(
      `DRY RUN OK: ${cardsSorted.length} cards, fee range $${Math.min(...fees)}–$${Math.max(...fees)}.`,
    );
    for (const c of cardsSorted.slice(0, 5)) {
      console.log(`  $${c.annualFee / 100} — ${c.name} (${c.perks.length} perks)`);
    }
    console.log("Dry run complete — no database changes made.");
    return;
  }

  const db = drizzle(neon(databaseUrl), { schema });

  for (const card of cardsSorted) {
    const [row] = await db
      .insert(schema.cards)
      .values({
        name: card.name,
        issuer: card.issuer,
        network: card.network,
        annualFee: card.annualFee,
        foreignTransactionFee: card.foreignTransactionFee,
        multipliersJson: card.multipliers,
        sourcesJson: card.sources,
      })
      .onConflictDoUpdate({
        target: schema.cards.name,
        set: {
          issuer: card.issuer,
          network: card.network,
          annualFee: card.annualFee,
          foreignTransactionFee: card.foreignTransactionFee,
          multipliersJson: card.multipliers,
          sourcesJson: card.sources,
        },
      })
      .returning({ id: schema.cards.id });

    // Replace perks so the seed stays idempotent on re-runs.
    await db.delete(schema.perks).where(eq(schema.perks.cardId, row.id));
    if (card.perks.length > 0) {
      await db.insert(schema.perks).values(
        card.perks.map((p) => ({
          cardId: row.id,
          name: p.name,
          amountCents: p.amountCents,
          cadence: p.cadence,
          details: p.details,
        })),
      );
    }
    console.log(
      `  ✓ ${card.name} (${card.perks.length} perks)`,
    );
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
