/**
 * Portal seed core: normalize data/portals.json into portal_merchants rows
 * and upsert them. Shared by the `npm run db:seed` CLI (scripts/seed.ts)
 * and the one-off Vercel bootstrap route.
 */
import { eq, and } from "drizzle-orm";
import * as schema from "@/drizzle/schema";
import type { Db } from "./db";

export interface RawPortalMerchant {
  name?: unknown;
  miles_per_dollar?: unknown;
  milesPerDollar?: unknown;
  source?: unknown;
}

export interface RawPortal {
  name?: unknown;
  program?: unknown;
  url?: unknown;
  sources?: unknown;
  checked?: unknown;
  merchants?: unknown;
}

export interface NormalizedPortalMerchant {
  merchant: string;
  milesPerDollar: number;
  sourceUrl: string | null;
}

export interface NormalizedPortal {
  portal: string;
  program: string | null;
  portalUrl: string | null;
  sources: string[];
  checkedAt: Date | null;
  merchants: NormalizedPortalMerchant[];
}

function toRate(value: unknown, merchant: string, portal: string): number {
  const v =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(v) || v < 0) {
    throw new Error(
      `Portal merchant "${merchant}" in "${portal}" has an invalid miles_per_dollar (must be a non-negative number).`,
    );
  }
  return v;
}

export function normalizePortalList(raw: unknown): NormalizedPortal[] {
  const doc = raw as { portals?: unknown };
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.portals)) {
    throw new Error('data/portals.json must have a top-level "portals" array.');
  }
  const out: NormalizedPortal[] = [];
  for (const p of doc.portals as RawPortal[]) {
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("Every portal must have a name.");
    if (p.merchants !== undefined && !Array.isArray(p.merchants)) {
      throw new Error(`Portal "${name}" has a non-array "merchants" field.`);
    }
    const sources = Array.isArray(p.sources)
      ? p.sources.map((s) => String(s))
      : [];
    const merchants: NormalizedPortalMerchant[] = [];
    const seen = new Set<string>();
    for (const m of ((p.merchants ?? []) as RawPortalMerchant[])) {
      const merchant = String(m.name ?? "").trim();
      if (!merchant) {
        throw new Error(`Portal "${name}" has a merchant with no name.`);
      }
      const key = merchant.toLowerCase();
      if (seen.has(key)) {
        throw new Error(
          `Portal "${name}" lists merchant "${merchant}" more than once.`,
        );
      }
      seen.add(key);
      merchants.push({
        merchant,
        milesPerDollar: toRate(
          m.miles_per_dollar ?? m.milesPerDollar,
          merchant,
          name,
        ),
        sourceUrl: m.source ? String(m.source) : null,
      });
    }
    out.push({
      portal: name,
      program: p.program ? String(p.program) : null,
      portalUrl: p.url ? String(p.url) : null,
      sources,
      checkedAt: p.checked ? new Date(String(p.checked)) : null,
      merchants,
    });
  }
  return out;
}

/** Upsert each (portal, merchant) pair. Returns counts. */
export async function seedPortals(
  db: Db,
  portals: NormalizedPortal[],
): Promise<{ portals: number; merchants: number; inserted: number; updated: number }> {
  let merchantCount = 0;
  let inserted = 0;
  let updated = 0;
  for (const p of portals) {
    for (const m of p.merchants) {
      merchantCount++;
      const existing = await db
        .select({ id: schema.portalMerchants.id })
        .from(schema.portalMerchants)
        .where(
          and(
            eq(schema.portalMerchants.portal, p.portal),
            eq(schema.portalMerchants.merchant, m.merchant),
          ),
        )
        .limit(1);
      const row = {
        portal: p.portal,
        program: p.program,
        merchant: m.merchant,
        milesPerDollar: m.milesPerDollar,
        portalUrl: p.portalUrl,
        sourceUrl: m.sourceUrl,
        checkedAt: p.checkedAt,
      };
      if (existing.length > 0) {
        await db
          .update(schema.portalMerchants)
          .set(row)
          .where(eq(schema.portalMerchants.id, existing[0].id));
        updated++;
      } else {
        await db.insert(schema.portalMerchants).values(row);
        inserted++;
      }
    }
  }
  return { portals: portals.length, merchants: merchantCount, inserted, updated };
}
