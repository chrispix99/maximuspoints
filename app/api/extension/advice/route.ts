import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cards, portalMerchants } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { rankCards, POINT_VALUE_CENTS } from "@/lib/card-math";
import {
  merchantForDomain,
  categoryForMerchant,
} from "@/lib/merchant-domains";
import { CATEGORY_LABELS } from "@/lib/card-math";

/**
 * GET /api/extension/advice?domain=bestbuy.com — public, read-only.
 * Resolves a shopping domain to a merchant, then returns the best
 * portal rates and the best-earning cards for that merchant's category.
 * Used by the Point Maximus Chrome extension popup.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") ?? "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  const merchant = merchantForDomain(domain);
  if (!merchant) {
    return NextResponse.json({ merchant: null, domain });
  }

  try {
    const db = getDb();
    const cardRows = await db
      .select({
        id: cards.id,
        name: cards.name,
        issuer: cards.issuer,
        annualFee: cards.annualFee,
        multipliersJson: cards.multipliersJson,
      })
      .from(cards);
    const portalRows = await db
      .select()
      .from(portalMerchants)
      .where(eq(portalMerchants.merchant, merchant));

    const category = categoryForMerchant(merchant);
    const ranked = rankCards(cardRows, category, 200).sort(
      (a, b) => b.pointsPerDollar - a.pointsPerDollar,
    );
    const portals = [...portalRows]
      .sort((a, b) => b.milesPerDollar - a.milesPerDollar)
      .map((r) => ({
        portal: r.portal,
        program: r.program,
        rate: r.milesPerDollar,
        elevated: r.elevated,
        note: r.note,
        url: r.portalUrl,
        checkedAt: r.checkedAt ? r.checkedAt.toISOString().slice(0, 10) : null,
      }));

    return NextResponse.json({
      domain,
      merchant,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      pointValueCents: POINT_VALUE_CENTS,
      portals,
      cards: ranked.slice(0, 12).map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        annualFeeCents: c.annualFeeCents,
        pointsPerDollar: c.pointsPerDollar,
      })),
    });
  } catch (err) {
    console.error("extension/advice failed:", (err as Error).message);
    return NextResponse.json(
      { merchant, error: "data unavailable" },
      { status: 503 },
    );
  }
}
