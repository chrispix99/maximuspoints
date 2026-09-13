"use client";

import { useMemo, useState } from "react";
import { Panel, SortSelect } from "./ui";
import { formatMoney, type Category, CATEGORIES } from "@/lib/card-math";
import type { CardMultipliers, PerkCadence } from "@/drizzle/schema";
import { CADENCE_LABELS } from "@/lib/periods";

export interface CardWithPerks {
  id: string;
  name: string;
  issuer: string;
  network: string | null;
  annualFee: number;
  foreignTransactionFee: boolean;
  multipliersJson: CardMultipliers | null;
  sourcesJson: string[] | null;
  perks: {
    id: string;
    name: string;
    amountCents: number;
    cadence: PerkCadence;
    details: string | null;
  }[];
}

const MULT_LABELS: { key: Category; label: string }[] = CATEGORIES.map((c) => ({
  key: c,
  label: c.replace(/_/g, " "),
}));

/** Annualize a perk's dollar value from its cadence. */
function perkAnnualValueCents(perk: {
  amountCents: number;
  cadence: PerkCadence;
}): number {
  const mult =
    perk.cadence === "monthly"
      ? 12
      : perk.cadence === "quarterly"
        ? 4
        : perk.cadence === "semiannual"
          ? 2
          : 1;
  return perk.amountCents * mult;
}

type CardSort = "fee-desc" | "fee-asc" | "perks-value" | "perks-count" | "name";

const SORT_OPTIONS: { value: CardSort; label: string }[] = [
  { value: "fee-desc", label: "Annual fee: high to low" },
  { value: "fee-asc", label: "Annual fee: low to high" },
  { value: "perks-value", label: "Highest perk value / yr" },
  { value: "perks-count", label: "Most perks" },
  { value: "name", label: "Name A–Z" },
];

export default function CardsClient({ cards }: { cards: CardWithPerks[] }) {
  const [issuer, setIssuer] = useState("all");
  const [sort, setSort] = useState<CardSort>("fee-desc");

  const issuers = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.issuer))).sort()],
    [cards],
  );

  const filtered = useMemo(() => {
    const list =
      issuer === "all" ? cards : cards.filter((c) => c.issuer === issuer);
    return [...list].sort((a, b) => {
      switch (sort) {
        case "fee-asc":
          return a.annualFee - b.annualFee;
        case "perks-value": {
          const va = a.perks.reduce((n, p) => n + perkAnnualValueCents(p), 0);
          const vb = b.perks.reduce((n, p) => n + perkAnnualValueCents(p), 0);
          return vb - va;
        }
        case "perks-count":
          return b.perks.length - a.perks.length;
        case "name":
          return a.name.localeCompare(b.name);
        case "fee-desc":
        default:
          return b.annualFee - a.annualFee;
      }
    });
  }, [cards, issuer, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="issuer" className="text-sm font-medium text-slate-700">
          Issuer
        </label>
        <select
          id="issuer"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {issuers.map((i) => (
            <option key={i} value={i}>
              {i === "all" ? "All issuers" : i}
            </option>
          ))}
        </select>
        <SortSelect
          id="cards-sort"
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
        />
        <span className="text-xs text-slate-500">
          {filtered.length} card{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((card) => (
          <Panel key={card.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {card.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {card.issuer}
                  {card.network ? ` · ${card.network}` : ""}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900">
                  {formatMoney(card.annualFee)}
                </div>
                <div className="text-xs text-slate-500">annual fee</div>
              </div>
            </div>

            {card.foreignTransactionFee && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                ⚠️ Foreign transaction fees apply
              </p>
            )}

            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Earn rates
              </h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {MULT_LABELS.filter(
                  ({ key }) => (card.multipliersJson?.[key] ?? 0) > 0,
                ).map(({ key, label }) => (
                  <span
                    key={key}
                    className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
                  >
                    {card.multipliersJson![key]}× {label}
                  </span>
                ))}
              </div>
            </div>

            {card.perks.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Perks & credits
                </h3>
                <ul className="mt-1 space-y-1.5">
                  {card.perks.map((perk) => (
                    <li key={perk.id} className="text-sm">
                      <span className="font-medium text-slate-800">
                        {perk.name}
                      </span>{" "}
                      <span className="text-slate-600">
                        — {formatMoney(perk.amountCents)}{" "}
                        {CADENCE_LABELS[perk.cadence].toLowerCase()}
                      </span>
                      {perk.details && (
                        <span className="block text-xs text-slate-500">
                          {perk.details}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(card.sourcesJson?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sources
                </h3>
                <ul className="mt-1 space-y-0.5">
                  {card.sourcesJson!.map((src, i) => (
                    <li key={i} className="truncate text-xs">
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        {src}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        ))}
      </div>

      {filtered.length === 0 && (
        <Panel className="text-center text-sm text-slate-500">
          No cards from this issuer.
        </Panel>
      )}
    </div>
  );
}
