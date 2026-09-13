/**
 * Card seed core: normalize research JSON into DB rows and upsert them.
 * Shared by the `npm run db:seed` CLI (scripts/seed.ts) and the one-off
 * Vercel bootstrap route (app/api/admin/bootstrap/route.ts).
 */
import { eq } from "drizzle-orm";
import * as schema from "@/drizzle/schema";
import type { CardMultipliers, PerkCadence } from "@/drizzle/schema";
import type { Db } from "./db";

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

export interface RawPerk {
  name?: unknown;
  amount?: unknown;
  amountCents?: unknown;
  cadence?: unknown;
  details?: unknown;
}

export interface RawCard {
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

export interface NormalizedCard {
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
}

function normalizeCard(raw: RawCard, index: number): NormalizedCard {
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

/** Accept one parsed research file per entry (bare array or {"cards": [...]});
 *  merges, dedupes by card name (case-insensitive, first file wins), sorts by
 *  annual fee descending. Throws on malformed data. */
export function normalizeCardList(
  files: { label: string; parsed: unknown }[],
): NormalizedCard[] {
  const seen = new Map<string, NormalizedCard>();
  for (const { label, parsed } of files) {
    let arr: unknown = parsed;
    if (!Array.isArray(arr)) {
      if (
        arr &&
        typeof arr === "object" &&
        Array.isArray((arr as { cards?: unknown }).cards)
      ) {
        arr = (arr as { cards: unknown[] }).cards;
      } else {
        throw new Error(
          `${label} must contain a JSON array of cards or {"cards": [...]}.`,
        );
      }
    }
    (arr as RawCard[]).forEach((raw, i) => {
      const card = normalizeCard(raw, i);
      const key = card.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, card);
    });
  }
  return [...seen.values()].sort((a, b) => b.annualFee - a.annualFee);
}

/** Upsert cards by name and replace each card's perks (idempotent). */
export async function seedCards(
  db: Db,
  cards: NormalizedCard[],
): Promise<{ cards: number; perks: number }> {
  let perkCount = 0;
  for (const card of cards) {
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
    perkCount += card.perks.length;
  }
  return { cards: cards.length, perks: perkCount };
}
