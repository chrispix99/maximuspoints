/**
 * Shared loader for public card pages (DB first, research-JSON fallback).
 * The monthly refresh keeps data/*.json and Neon in sync, so either source
 * is real data — the fallback only guarantees the build never breaks when
 * DATABASE_URL is unset.
 */
import { desc } from "drizzle-orm";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getDb } from "./db";
import { cards } from "@/drizzle/schema";

export interface PublicPerk {
  name: string;
  amountCents: number;
  cadence: string;
  details: string | null;
}

export interface PublicCard {
  name: string;
  issuer: string;
  network: string | null;
  annualFee: number; // cents
  foreignTransactionFee: boolean;
  multipliers: Record<string, number>;
  details: string | null;
  perks: PublicPerk[];
  sources: string[];
}

function loadFromJson(): PublicCard[] {
  const dir = join(process.cwd(), "data");
  const out: PublicCard[] = [];
  const seen = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.startsWith("cards_") || !file.endsWith(".json")) continue;
    const parsed: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { cards?: unknown[] }).cards ?? [];
    for (const raw of arr as Record<string, unknown>[]) {
      const name = String(raw.name ?? "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const perks = Array.isArray(raw.perks) ? raw.perks : [];
      out.push({
        name,
        issuer: String(raw.issuer ?? ""),
        network: raw.network == null ? null : String(raw.network),
        annualFee: Math.round(Number(raw.annual_fee ?? raw.annualFee ?? 0) * 100),
        foreignTransactionFee:
          raw.foreign_transaction_fee === true ||
          raw.foreignTransactionFee === true,
        multipliers: (raw.multipliers as Record<string, number>) ?? {},
        details: raw.details == null ? null : String(raw.details),
        perks: (perks as Record<string, unknown>[]).map((p) => ({
          name: String(p.name ?? ""),
          amountCents: Math.round(Number(p.amount ?? 0) * 100),
          cadence: String(p.cadence ?? "annual"),
          details: p.details == null ? null : String(p.details),
        })),
        sources: Array.isArray(raw.sources)
          ? (raw.sources as unknown[]).filter(
              (s): s is string => typeof s === "string",
            )
          : [],
      });
    }
  }
  return out.sort((a, b) => b.annualFee - a.annualFee);
}

export async function loadAllCards(): Promise<PublicCard[]> {
  try {
    const db = getDb();
    const rows = await db.query.cards.findMany({
      orderBy: [desc(cards.annualFee)],
      with: { perks: true },
    });
    if (rows.length === 0) return loadFromJson();
    return rows.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      network: c.network,
      annualFee: c.annualFee,
      foreignTransactionFee: c.foreignTransactionFee,
      multipliers: (c.multipliersJson ?? {}) as Record<string, number>,
      details: null, // not stored in DB; JSON fallback carries it
      perks: c.perks.map((p) => ({
        name: p.name,
        amountCents: p.amountCents,
        cadence: p.cadence,
        details: p.details,
      })),
      sources: c.sourcesJson ?? [],
    }));
  } catch {
    return loadFromJson();
  }
}
