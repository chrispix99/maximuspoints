"use client";

import { useMemo, useState } from "react";
import { Panel, RankBadge, SortSelect } from "./ui";
import {
  rankCards,
  formatMoney,
  formatNumber,
  CATEGORIES,
  CATEGORY_LABELS,
  POINT_VALUE_CENTS,
  type Category,
} from "@/lib/card-math";
import type { CardMultipliers } from "@/drizzle/schema";

export interface OptimizerCard {
  id: string;
  name: string;
  issuer: string;
  annualFee: number;
  multipliersJson: CardMultipliers | null;
}

const SPEND_PRESETS = [100, 250, 500, 1000, 2500];

export default function OptimizerClient({ cards }: { cards: OptimizerCard[] }) {
  const [category, setCategory] = useState<Category>("dining");
  const [monthlySpend, setMonthlySpend] = useState(500);
  const [sort, setSort] = useState<"net" | "ppd" | "points" | "gross" | "fee">(
    "net",
  );

  const ranked = useMemo(() => {
    const list = rankCards(cards, category, monthlySpend);
    return [...list].sort((a, b) => {
      switch (sort) {
        case "ppd":
          return b.pointsPerDollar - a.pointsPerDollar;
        case "points":
          return b.estAnnualPoints - a.estAnnualPoints;
        case "gross":
          return b.estAnnualValueCents - a.estAnnualValueCents;
        case "fee":
          return a.annualFeeCents - b.annualFeeCents;
        case "net":
        default:
          return b.netAnnualValueCents - a.netAnnualValueCents;
      }
    });
  }, [cards, category, monthlySpend, sort]);

  return (
    <div>
      <Panel className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700"
            >
              Spend category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="spend"
              className="block text-sm font-medium text-slate-700"
            >
              Monthly spend ($)
            </label>
            <input
              id="spend"
              type="number"
              min={0}
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SPEND_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setMonthlySpend(p)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Points valued at {POINT_VALUE_CENTS}¢ each. Net value = estimated
            annual rewards − annual fee.
          </p>
          <SortSelect
            id="optimizer-sort"
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "net", label: "Best net value / yr" },
              { value: "ppd", label: "Most points per $" },
              { value: "points", label: "Most total points / yr" },
              { value: "gross", label: "Highest rewards value" },
              { value: "fee", label: "Lowest annual fee" },
            ]}
          />
        </div>
      </Panel>

      <div className="space-y-3">
        {ranked.map((card, i) => (
          <Panel key={card.id} className="flex items-center gap-4">
            <RankBadge rank={i + 1} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="truncate text-base font-bold text-slate-900">
                  {card.name}
                </h2>
                <span
                  className={`text-sm font-bold ${card.netAnnualValueCents >= 0 ? "text-green-700" : "text-red-600"}`}
                >
                  {card.netAnnualValueCents >= 0 ? "+" : ""}
                  {formatMoney(card.netAnnualValueCents)}/yr net
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">
                <span className="font-semibold text-brand-700">
                  {card.pointsPerDollar}×
                </span>{" "}
                on {CATEGORY_LABELS[category].toLowerCase()} ·{" "}
                {formatNumber(card.estAnnualPoints)} pts/yr ≈{" "}
                {formatMoney(card.estAnnualValueCents)} rewards −{" "}
                {formatMoney(card.annualFeeCents)} fee
              </p>
              <p className="text-xs text-slate-400">{card.issuer}</p>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
