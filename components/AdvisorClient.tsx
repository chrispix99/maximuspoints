"use client";

import { useMemo, useState } from "react";
import { Panel, RankBadge, SortSelect } from "./ui";
import { detectCategory } from "@/lib/category-detect";
import {
  rankCards,
  formatMoney,
  CATEGORY_LABELS,
  POINT_VALUE_CENTS,
} from "@/lib/card-math";
import type { OptimizerCard } from "./OptimizerClient";

const QUICK_PICKS = [
  "Dinner at a steakhouse",
  "Groceries at Costco",
  "Gas at Costco",
  "Alaska Airlines flight to Seattle",
  "Hotel in Bellevue",
  "Coffee with a friend",
  "Everyday spending",
];

export default function AdvisorClient({ cards }: { cards: OptimizerCard[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"net" | "ppd" | "points" | "fee">("net");

  const result = useMemo(() => {
    const detection = detectCategory(query);
    const ranked = rankCards(cards, detection.category, 200);
    const sorted = [...ranked].sort((a, b) => {
      switch (sort) {
        case "ppd":
          return b.pointsPerDollar - a.pointsPerDollar;
        case "points":
          return b.estAnnualPoints - a.estAnnualPoints;
        case "fee":
          return a.annualFeeCents - b.annualFeeCents;
        case "net":
        default:
          return b.netAnnualValueCents - a.netAnnualValueCents;
      }
    });
    return { detection, ranked: sorted };
  }, [cards, query, sort]);

  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <Panel className="mb-6">
        <label
          htmlFor="purchase"
          className="block text-sm font-medium text-slate-700"
        >
          What are you about to buy?
        </label>
        <input
          id="purchase"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "dinner at a steakhouse", "gas at Costco", "Alaska Airlines flight"'
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
        />
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick picks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-brand-100 hover:text-brand-700"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {hasQuery && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-slate-500">Detected category:</span>
              <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                {CATEGORY_LABELS[result.detection.category]}
              </span>
              {result.detection.matchedKeyword && (
                <span className="text-xs text-slate-400">
                  matched “{result.detection.matchedKeyword}”
                </span>
              )}
            </span>
            <SortSelect
              id="advisor-sort"
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={[
                { value: "net", label: "Best net value" },
                { value: "ppd", label: "Most points per $" },
                { value: "points", label: "Most total points" },
                { value: "fee", label: "Lowest annual fee" },
              ]}
            />
          </div>

          <div className="space-y-3">
            {result.ranked.slice(0, 5).map((card, i) => (
              <Panel key={card.id} className="flex items-center gap-4">
                <RankBadge rank={i + 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="truncate text-base font-bold text-slate-900">
                      {card.name}
                    </h2>
                    <span className="text-sm font-bold text-brand-700">
                      {card.pointsPerDollar} pts/$
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {formatMoney(card.estAnnualValueCents / 12)} est. value on
                    this $200 purchase ({POINT_VALUE_CENTS}¢/pt) ·{" "}
                    {formatMoney(card.annualFeeCents)} annual fee
                  </p>
                  <p className="text-xs text-slate-400">{card.issuer}</p>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}

      {!hasQuery && (
        <p className="text-center text-sm text-slate-500">
          Type a purchase above (or tap a quick pick) to see which card to use.
        </p>
      )}
    </div>
  );
}
