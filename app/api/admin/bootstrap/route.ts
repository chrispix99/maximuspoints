/**
 * TEMPORARY one-off seed route. JSON is statically imported so the data is
 * bundled into the function. Guarded by BOOTSTRAP_KEY. DELETE after use.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { normalizeCardList, seedCards } from "@/lib/card-seed";
import { normalizePortalList, seedPortals } from "@/lib/portal-seed";
import premium from "@/data/cards_premium.json";
import midtier from "@/data/cards_midtier.json";
import gapfill from "@/data/cards_gapfill.json";
import nofee from "@/data/cards_nofee.json";
import cobrands from "@/data/cards_cobrands.json";
import business from "@/data/cards_business.json";
import store from "@/data/cards_store.json";
import portalsJson from "@/data/portals.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PORTAL_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "portal_merchants" (
  "id" text PRIMARY KEY NOT NULL,
  "portal" text NOT NULL,
  "program" text,
  "merchant" text NOT NULL,
  "miles_per_dollar" real NOT NULL,
  "elevated" boolean DEFAULT false NOT NULL,
  "note" text,
  "portal_url" text,
  "source_url" text,
  "checked_at" timestamp
)`;
const PORTAL_INDEX_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS "portal_merchant_idx" ON "portal_merchants" USING btree ("portal","merchant")`;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.BOOTSTRAP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const db = getDb();
    await db.execute(sql.raw(PORTAL_TABLE_SQL));
    await db.execute(sql.raw(PORTAL_INDEX_SQL));
    const cards = normalizeCardList([
      { label: "premium", parsed: premium },
      { label: "midtier", parsed: midtier },
      { label: "gapfill", parsed: gapfill },
      { label: "nofee", parsed: nofee },
      { label: "cobrands", parsed: cobrands },
      { label: "business", parsed: business },
      { label: "store", parsed: store },
    ]);
    const cardResult = await seedCards(db, cards);
    const portals = normalizePortalList(portalsJson);
    const portalResult = await seedPortals(db, portals);
    return NextResponse.json({
      ok: true,
      cards: cardResult,
      portals: portalResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
