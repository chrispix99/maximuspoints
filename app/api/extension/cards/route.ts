import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cards } from "@/drizzle/schema";

/**
 * GET /api/extension/cards — public, read-only card catalog for the
 * Point Maximus Chrome extension (powers the "my cards" picker).
 * All card data is public on the site already; no secrets here.
 */
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: cards.id,
        name: cards.name,
        issuer: cards.issuer,
        annualFee: cards.annualFee,
        multipliers: cards.multipliersJson,
      })
      .from(cards);
    return NextResponse.json({ cards: rows });
  } catch (err) {
    console.error("extension/cards failed:", (err as Error).message);
    return NextResponse.json({ cards: [] }, { status: 503 });
  }
}
