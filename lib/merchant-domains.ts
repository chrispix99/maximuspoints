import type { Category } from "./card-math";

/** Domain suffix → merchant display name (must match portal_merchants.merchant). */
const DOMAIN_MERCHANTS: [string, string][] = [
  ["adidas.com", "Adidas"],
  ["apple.com", "Apple"],
  ["athleta.com", "Athleta"],
  ["athleta.gap.com", "Athleta"],
  ["backcountry.com", "Backcountry"],
  ["bananarepublic.com", "Banana Republic"],
  ["bananarepublic.gap.com", "Banana Republic"],
  ["bestbuy.com", "Best Buy"],
  ["chewy.com", "Chewy"],
  ["coach.com", "Coach"],
  ["columbia.com", "Columbia"],
  ["cvs.com", "CVS"],
  ["shopdisney.com", "Disney Store"],
  ["ebay.com", "eBay"],
  ["expedia.com", "Expedia"],
  ["fandango.com", "Fandango"],
  ["gap.com", "Gap"],
  ["homedepot.com", "Home Depot"],
  ["hp.com", "HP"],
  ["ihg.com", "IHG"],
  ["instacart.com", "Instacart"],
  ["lego.com", "LEGO"],
  ["lenovo.com", "Lenovo"],
  ["lowes.com", "Lowe's"],
  ["lululemon.com", "Lululemon"],
  ["macys.com", "Macy's"],
  ["marriott.com", "Marriott"],
  ["michaelkors.com", "Michael Kors"],
  ["nike.com", "Nike"],
  ["oldnavy.com", "Old Navy"],
  ["oldnavy.gap.com", "Old Navy"],
  ["overstock.com", "Overstock"],
  ["petco.com", "Petco"],
  ["samsclub.com", "Sam's Club"],
  ["samsung.com", "Samsung"],
  ["sephora.com", "Sephora"],
  ["stubhub.com", "StubHub"],
  ["target.com", "Target"],
  ["underarmour.com", "Under Armour"],
  ["vrbo.com", "Vrbo"],
  ["walgreens.com", "Walgreens"],
];

/** Merchant → spend category used for card ranking. Defaults to "everyday". */
const MERCHANT_CATEGORIES: Record<string, Category> = {
  Marriott: "hotels",
  IHG: "hotels",
  Vrbo: "hotels",
  Expedia: "travel",
  Instacart: "groceries",
};

/** Longest-suffix domain match: "shop.nike.com" and "www.nike.com" both hit "nike.com". */
export function merchantForDomain(domain: string): string | null {
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!d) return null;
  let best: [string, string] | null = null;
  for (const pair of DOMAIN_MERCHANTS) {
    const [suffix, merchant] = pair;
    if (d === suffix || d.endsWith(`.${suffix}`)) {
      if (!best || suffix.length > best[0].length) best = pair;
    }
  }
  return best ? best[1] : null;
}

export function categoryForMerchant(merchant: string): Category {
  return MERCHANT_CATEGORIES[merchant] ?? "everyday";
}
