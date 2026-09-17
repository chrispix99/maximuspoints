import offersData from "@/data/offers.json";

export interface Offer {
  merchant: string;
  /** Merchant's main shopping domain, lowercase, no www (e.g. "dell.com"). */
  domain: string;
  network: "amex" | "chase";
  headline: string;
  details: string;
  /** Expiry as YYYY-MM-DD. */
  expires: string;
  source_url: string;
}

function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Publicly-reported Amex Offers / Chase Offers (enroll-and-save deals).
 * Only offers that have not yet expired are returned.
 * These are sourced from public roundups (Doctor of Credit, TPG, ...);
 * individual accounts may see different/targeted offers.
 */
export function getActiveOffers(today = new Date()): Offer[] {
  const t = todayStr(today);
  return (offersData as Offer[])
    .filter((o) => o && typeof o.expires === "string" && o.expires >= t)
    .sort((a, b) => a.expires.localeCompare(b.expires));
}
