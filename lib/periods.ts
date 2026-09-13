import type { PerkCadence } from "@/drizzle/schema";

/** Current period key for a perk cadence, e.g. "2026-09", "2026-Q3",
 *  "2026-H1", "2026". */
export function currentPeriodKey(cadence: PerkCadence, now = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  switch (cadence) {
    case "monthly":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "quarterly":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "semiannual":
      return `${y}-H${m < 6 ? 1 : 2}`;
    case "annual":
      return `${y}`;
  }
}

/** Last calendar day (local) of the period described by a period key. */
export function periodEndDate(cadence: PerkCadence, periodKey: string): Date {
  if (cadence === "monthly") {
    const [y, mo] = periodKey.split("-").map(Number);
    return new Date(y, mo, 0); // day 0 of next month = last day of this one
  }
  if (cadence === "quarterly") {
    const [y, q] = periodKey.split("-Q").map(Number);
    return new Date(y, q * 3, 0);
  }
  if (cadence === "semiannual") {
    const [y, h] = periodKey.split("-H").map(Number);
    return new Date(y, h === 1 ? 6 : 12, 0);
  }
  // annual
  return new Date(Number(periodKey), 12, 0);
}

/** True when the period ends within `days` from now (and hasn't ended). */
export function isExpiringSoon(
  cadence: PerkCadence,
  periodKey: string,
  days = 30,
  now = new Date(),
): boolean {
  const end = periodEndDate(cadence, periodKey);
  const msLeft = end.getTime() - now.getTime();
  return msLeft >= 0 && msLeft <= days * 24 * 60 * 60 * 1000;
}

export const CADENCE_LABELS: Record<PerkCadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
};
