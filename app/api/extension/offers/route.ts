import { NextResponse } from "next/server";
import { getActiveOffers } from "@/lib/offers";
import { merchantForDomain } from "@/lib/merchant-domains";

/**
 * GET /api/extension/offers?domain=bestbuy.com — public, read-only.
 * Returns active (non-expired) Amex Offers / Chase Offers for the merchant
 * behind the given shopping domain. Used by the Point Maximus Chrome
 * extension popup. These are publicly-reported offers; an individual
 * cardholder's account may show different or targeted offers.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") ?? "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  const merchant = merchantForDomain(domain);
  const offers = getActiveOffers().filter((o) => {
    const od = (o.domain ?? "").toLowerCase().replace(/^www\./, "");
    if (!od) return false;
    if (domain === od || domain.endsWith(`.${od}`)) return true;
    return merchant !== null && merchantForDomain(od) === merchant;
  });

  return NextResponse.json({
    domain,
    merchant,
    offers: offers.map((o) => ({
      merchant: o.merchant,
      network: o.network,
      headline: o.headline,
      details: o.details,
      expires: o.expires,
      source_url: o.source_url,
    })),
  });
}
