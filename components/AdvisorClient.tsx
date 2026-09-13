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

export interface PortalBonus {
  merchant: string;
  portal: string;
  program: string | null;
  rate: number;
  elevated: boolean;
  note: string | null;
  url: string | null;
  checkedAt: string | null;
}

/** Find a merchant mentioned in the query (word-boundary, longest match wins). */
export function detectMerchant(
  query: string,
  portals: PortalBonus[],
): PortalBonus[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byMerchant = new Map<string, PortalBonus[]>();
  for (const p of portals) {
    const list = byMerchant.get(p.merchant) ?? [];
    list.push(p);
    byMerchant.set(p.merchant, list);
  }
  let best: { name: string; bonuses: PortalBonus[] } | null = null;
  for (const [name, bonuses] of byMerchant) {
    const pattern = new RegExp(
      `\\b${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    );
    if (pattern.test(q) && (!best || name.length > best.name.length)) {
      best = { name, bonuses };
    }
  }
  if (!best) return [];
  return [...best.bonuses].sort((a, b) => b.rate - a.rate);
}

export default function AdvisorClient({
  cards,
  portals,
}: {
  cards: OptimizerCard[];
  portals: PortalBonus[];
}) {
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
    return {
      detection,
      ranked: sorted,
      merchantBonuses: detectMerchant(query, portals),
      stack: (() => {
        const bonuses = detectMerchant(query, portals);
        const portal = bonuses[0] ?? null;
        if (!portal) return null;
        const card = [...sorted].sort(
          (a, b) => b.pointsPerDollar - a.pointsPerDollar,
        )[0];
        if (!card) return null;
        return {
          portal,
          card,
          total: portal.rate + card.pointsPerDollar,
          alternatives: bonuses.slice(1, 4),
        };
      })(),
    };
  }, [cards, query, sort, portals]);

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
          {result.stack && (
            <Panel className="mb-4 border-brand-200 bg-brand-50">
              <h3 className="text-sm font-bold text-slate-900">
                ⚡ Max stack at {result.stack.portal.merchant}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                One portal per purchase — the merchant only credits the last
                click-through, so take the best rate. Your card and the
                store&apos;s free loyalty program always stack on top.
              </p>
              <ol className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Click through{" "}
                        <span className="font-semibold text-slate-900">
                          {result.stack.portal.portal}
                        </span>
                      </span>
                      <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
                        +{result.stack.portal.rate} /$
                      </span>
                      {result.stack.portal.elevated && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          boosted
                        </span>
                      )}
                      {result.stack.portal.url && (
                        <a
                          href={result.stack.portal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                          Shop →
                        </a>
                      )}
                    </div>
                    {result.stack.portal.program && (
                      <p className="text-xs text-slate-500">
                        Earns {result.stack.portal.program} — paid by the
                        portal, not the card.
                      </p>
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <span>
                      Pay with{" "}
                      <span className="font-semibold text-slate-900">
                        {result.stack.card.name}
                      </span>{" "}
                      →{" "}
                      <span className="font-semibold text-slate-900">
                        +{result.stack.card.pointsPerDollar} pts/$
                      </span>
                    </span>
                    <p className="text-xs text-slate-500">
                      {result.stack.card.issuer} · top pick for{" "}
                      {CATEGORY_LABELS[result.detection.category]}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    3
                  </span>
                  <div className="min-w-0 flex-1">
                    <span>
                      Join {result.stack.portal.merchant}&apos;s free loyalty
                      program — it still earns on portal click-throughs.
                    </span>
                  </div>
                </li>
              </ol>
              <div className="mt-3 rounded-lg bg-white px-3 py-2.5 text-sm">
                <span className="font-bold text-slate-900">
                  ≈ {result.stack.total} pts/$ total
                </span>
                <span className="text-slate-600">
                  {" "}
                  — about {formatMoney(Math.round(result.stack.total * 100))}{" "}
                  back per $100, split across{" "}
                  {result.stack.portal.program ?? result.stack.portal.portal}{" "}
                  and your card (valued at {POINT_VALUE_CENTS}¢/pt)
                </span>
              </div>
              {result.stack.alternatives.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Other portal rates
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {result.stack.alternatives.map((b) => (
                      <li
                        key={b.portal}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 font-medium text-slate-700">
                          {b.portal}
                          {b.program && (
                            <span className="text-xs font-normal text-slate-500">
                              {" "}
                              · {b.program}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            +{b.rate} /$
                          </span>
                          {b.url && (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-brand-700 hover:underline"
                            >
                              Shop →
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-500">
                Tip: check Amex Offers / Chase Offers in your banking app too —
                those usually stack as well.
              </p>
              {result.merchantBonuses.some((b) => b.note) && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Note:{" "}
                  {[
                    ...new Set(
                      result.merchantBonuses
                        .map((b) => b.note)
                        .filter(Boolean) as string[],
                    ),
                  ].join(" · ")}
                </p>
              )}
              {result.stack.portal.checkedAt && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Portal rates change often — last checked{" "}
                  {result.stack.portal.checkedAt}.
                </p>
              )}
            </Panel>
          )}
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
