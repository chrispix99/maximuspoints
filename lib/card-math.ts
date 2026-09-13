import type { CardMultipliers } from "@/drizzle/schema";

/** Spend categories supported by the optimizer/advisor. Keys match the
 *  multipliersJson shape on the cards table. */
export const CATEGORIES = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "flights",
  "hotels",
  "alaska_airlines",
  "everyday",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  dining: "Dining",
  groceries: "Groceries",
  gas: "Gas",
  travel: "Travel",
  flights: "Flights",
  hotels: "Hotels",
  alaska_airlines: "Alaska Airlines",
  everyday: "Everyday",
};

/** Conservative point valuation used across the app: 1¢ per point.
 *  Shown to the user so the math is transparent. */
export const POINT_VALUE_CENTS = 1;

export interface RankedCard {
  id: string;
  name: string;
  issuer: string;
  annualFeeCents: number;
  pointsPerDollar: number;
  estAnnualPoints: number;
  estAnnualValueCents: number;
  netAnnualValueCents: number;
}

function multiplierFor(m: CardMultipliers, category: Category): number {
  const direct = m[category];
  if (typeof direct === "number" && direct > 0) return direct;
  const fallback = m.everyday;
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return 1; // worst case: 1x base earn
}

/** Rank cards for a category + monthly spend. Returns best net value first. */
export function rankCards(
  cards: {
    id: string;
    name: string;
    issuer: string;
    annualFee: number;
    multipliersJson: CardMultipliers | null;
  }[],
  category: Category,
  monthlySpend: number,
): RankedCard[] {
  const annualSpend = Math.max(0, monthlySpend) * 12;
  return cards
    .map((card) => {
      const ppd = multiplierFor(card.multipliersJson ?? {}, category);
      const estAnnualPoints = annualSpend * ppd;
      const estAnnualValueCents = Math.round(
        estAnnualPoints * POINT_VALUE_CENTS,
      );
      return {
        id: card.id,
        name: card.name,
        issuer: card.issuer,
        annualFeeCents: card.annualFee,
        pointsPerDollar: ppd,
        estAnnualPoints: Math.round(estAnnualPoints),
        estAnnualValueCents,
        netAnnualValueCents: estAnnualValueCents - card.annualFee,
      };
    })
    .sort((a, b) => b.netAnnualValueCents - a.netAnnualValueCents);
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(abs % 100 === 0 ? 0 : 2)}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
