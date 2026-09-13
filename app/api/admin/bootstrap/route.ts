/**
 * TEMPORARY one-off seed route. JSON is statically imported so the data is
 * bundled into the function. Guarded by BOOTSTRAP_KEY. DELETE after use.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizeCardList, seedCards } from "@/lib/card-seed";
import premium from "@/data/cards_premium.json";
import midtier from "@/data/cards_midtier.json";
import gapfill from "@/data/cards_gapfill.json";
import nofee from "@/data/cards_nofee.json";
import cobrands from "@/data/cards_cobrands.json";
import business from "@/data/cards_business.json";
import store from "@/data/cards_store.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.BOOTSTRAP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const cards = normalizeCardList([
      { label: "premium", parsed: premium },
      { label: "midtier", parsed: midtier },
      { label: "gapfill", parsed: gapfill },
      { label: "nofee", parsed: nofee },
      { label: "cobrands", parsed: cobrands },
      { label: "business", parsed: business },
      { label: "store", parsed: store },
    ]);
    const result = await seedCards(getDb(), cards);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
