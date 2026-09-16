import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { ApplyCta, AdvertiserDisclosure } from "@/components/monetization";
import EmailCapture from "@/components/EmailCapture";
import { loadAllCards, type PublicCard } from "@/lib/card-data";
import {
  buildSlugMap,
  allCardNamesFromJson,
} from "@/lib/card-slug";
import { formatMoney } from "@/lib/card-math";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {  title: "Best credit cards for Alaska Airlines flyers (2026) — maximusPoints",
  description:
    "Compare the Atmos Rewards Ascent, Summit, and Business cards plus the best transferable-points cards for Alaska Airlines spend — real earn math, companion fare details, and fees.",
  openGraph: {
    title: "Best credit cards for Alaska Airlines flyers — maximusPoints",
    description:
      "Real earn math for Atmos Rewards: which card earns the most on Alaska Airlines purchases, and when the $99 companion fare pays for the annual fee.",
    type: "website",
  },
  alternates: { canonical: "/alaska" },
};

function cardLink(name: string): string {
  const slug = SLUG_MAP.get(name);
  return slug ? `/cards/${slug}` : "/cards";
}

// Built once per server instance — data/*.json ships with the deployment.
const SLUG_MAP = buildSlugMap(allCardNamesFromJson());

function EarnMath({ card }: { card: PublicCard }) {
  const mult = card.multipliers.alaska_airlines ?? 0;
  const monthly = 500; // example Alaska spend
  const pts = Math.round(monthly * 12 * mult);
  return (
    <p className="mt-2 text-sm text-slate-600">
      <span className="font-semibold text-brand-700">{mult}×</span> on Alaska
      Airlines purchases → ${monthly}/mo in Alaska spend earns{" "}
      <span className="font-semibold text-slate-900">
        {pts.toLocaleString()} pts/yr ≈ {formatMoney(pts)}
      </span>{" "}
      (valued at 1¢/pt)
      {card.annualFee > 0 && (
        <>
          {" "}
          against a {formatMoney(card.annualFee)} annual fee
        </>
      )}
      .
    </p>
  );
}

export default async function AlaskaPage() {
  const all = await loadAllCards();
  // True Alaska earners: cards with above-base Alaska Airlines multipliers.
  const alaskaEarners = all
    .filter((c) => (c.multipliers.alaska_airlines ?? 0) > 1)
    .sort(
      (a, b) =>
        (b.multipliers.alaska_airlines ?? 0) -
        (a.multipliers.alaska_airlines ?? 0),
    );
  const coBrands = alaskaEarners.filter((c) =>
    c.name.toLowerCase().includes("atmos"),
  );
  const transferables = alaskaEarners.filter(
    (c) => !c.name.toLowerCase().includes("atmos"),
  );

  return (
    <div>
      <PageHeader
        title="Best credit cards for Alaska Airlines flyers"
        subtitle="Real earn math for Atmos Rewards — the joint loyalty program of Alaska Airlines and Hawaiian Airlines. Points valued at 1¢ each."
      />

      <Panel className="mb-6 border-brand-200 bg-brand-50">
        <h2 className="text-base font-bold text-slate-900">
          Why Alaska flyers have it good
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            <span className="font-semibold">Atmos Rewards</span> is the single
            loyalty program across Alaska Airlines and Hawaiian Airlines, and
            Alaska is a <span className="font-semibold">oneworld</span> member
            — so points and status reach American Airlines, British Airways,
            Cathay Pacific, and the rest of the alliance.
          </li>
          <li>
            The co-brand cards&apos; headline perk is an annual{" "}
            <span className="font-semibold">$99 companion fare</span> (plus
            taxes and fees from $22): bring someone along on an Alaska flight
            for $99. One companion trip a year can dwarf the annual fee.
          </li>
          <li>
            Below, every number comes from our card database — same earn math
            as the{" "}
            <Link href="/optimizer" className="font-semibold text-brand-700 hover:underline">
              spend optimizer
            </Link>
            .
          </li>
        </ul>
      </Panel>

      <h2 className="mb-3 text-xl font-bold text-slate-900">
        The Atmos Rewards co-brand cards
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {coBrands.map((card) => {
          const companion = card.perks.find((p) =>
            p.name.toLowerCase().includes("companion"),
          );
          return (
            <Panel key={card.name}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    <Link
                      href={cardLink(card.name)}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {card.name}
                    </Link>
                  </h3>
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
              {card.details && (
                <p className="mt-2 text-sm text-slate-600">{card.details}</p>
              )}
              <EarnMath card={card} />
              {companion && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                  ✈️ <span className="font-semibold">Companion fare:</span>{" "}
                  {companion.details}
                </p>
              )}
              <ApplyCta cardName={card.name} />
            </Panel>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold text-slate-900">
        Best transferable-points cards for Alaska spend
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        No co-brand? These earn strong multipliers on airfare and travel that
        pair well with an Alaska-heavy wallet. Ranked by Alaska Airlines earn
        rate.
      </p>
      <div className="space-y-3">
        {transferables.slice(0, 8).map((card, i) => (
          <Panel key={card.name} className="flex items-center gap-4">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 ring-1 ring-slate-200">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="truncate text-base font-bold text-slate-900">
                  <Link
                    href={cardLink(card.name)}
                    className="hover:text-brand-700 hover:underline"
                  >
                    {card.name}
                  </Link>
                </h3>
                <span className="text-sm font-bold text-brand-700">
                  {card.multipliers.alaska_airlines}× Alaska ·{" "}
                  {formatMoney(card.annualFee)}/yr
                </span>
              </div>
              <p className="text-xs text-slate-400">{card.issuer}</p>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xl font-bold text-slate-900">
          When does the companion fare pay for the card?
        </h2>
        <Panel>
          <p className="text-sm text-slate-700">
            The $95/yr Ascent card&apos;s companion fare lets a second passenger
            fly for $99 plus taxes/fees after $6,000 in yearly card spend. If a
            single companion round-trip you&apos;d otherwise buy costs more
            than about $200, the fare benefit alone covers the annual fee —
            before counting the 3× points on Alaska purchases or the free
            checked bag. Run your own numbers in the{" "}
            <Link
              href="/advisor"
              className="font-semibold text-brand-700 hover:underline"
            >
              purchase advisor
            </Link>
            .
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <EmailCapture source="alaska" />
      </div>

      <div className="mt-6">
        <AdvertiserDisclosure />
      </div>
    </div>
  );
}
