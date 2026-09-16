import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";
import { ApplyCta, AdvertiserDisclosure } from "@/components/monetization";
import {
  loadAllCards,
  type PublicCard,
  type PublicPerk,
} from "@/lib/card-data";
import {
  slugify,
  buildSlugMap,
  nameForSlug,
  allCardNamesFromJson,
} from "@/lib/card-slug";
import { formatMoney } from "@/lib/card-math";
import { CADENCE_LABELS } from "@/lib/periods";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  dining: "dining",
  groceries: "groceries",
  gas: "gas",
  travel: "travel",
  flights: "flights",
  hotels: "hotels",
  everyday: "everyday purchases",
  alaska_airlines: "Alaska Airlines",
};

function multipliersSummary(card: PublicCard): string {
  const parts = Object.entries(card.multipliers)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(
      ([k, v]) => `${v}× ${CATEGORY_LABELS[k] ?? k.replace(/_/g, " ")}`,
    );
  return parts.join(", ");
}

export async function generateStaticParams() {
  const names = allCardNamesFromJson();
  const map = buildSlugMap(names);
  return [...map.values()].map((slug) => ({ slug }));
}

async function getCard(slug: string): Promise<PublicCard | undefined> {
  const name = nameForSlug(slug, allCardNamesFromJson());
  if (!name) return undefined;
  const all = await loadAllCards();
  return all.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const card = await getCard(params.slug);
  if (!card) return { title: "Card not found — maximusPoints" };
  const earn = multipliersSummary(card);
  const title = `${card.name} review: earn rates, perks & fees (2026) — maximusPoints`;
  const description =
    `The ${card.name} (${card.issuer}) earns ${earn || "base rewards"}` +
    `, charges ${formatMoney(card.annualFee)} annually` +
    (card.perks.length > 0
      ? `, and includes ${card.perks.length} perk credit${card.perks.length === 1 ? "" : "s"}.`
      : ".") +
    " Real earn math, sources, and fee breakdown.";
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/cards/${params.slug}` },
  };
}

function EarnExample({ card }: { card: PublicCard }) {
  const top = Object.entries(card.multipliers)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0];
  if (!top) return null;
  const [cat, mult] = top;
  const label = CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");
  const monthly = 500;
  const pts = Math.round(monthly * 12 * mult);
  return (
    <Panel className="border-brand-200 bg-brand-50">
      <h2 className="text-sm font-bold text-slate-900">Earn math example</h2>
      <p className="mt-1 text-sm text-slate-700">
        Spend ${monthly}/mo on {label} with the {card.name} and you&apos;d earn{" "}
        <span className="font-bold text-slate-900">
          {pts.toLocaleString()} pts/yr ≈ {formatMoney(pts)}
        </span>{" "}
        (valued at 1¢/pt)
        {card.annualFee > 0 && (
          <>
            {" "}
            against a {formatMoney(card.annualFee)} annual fee — net{" "}
            <span
              className={
                pts - card.annualFee >= 0
                  ? "font-bold text-green-700"
                  : "font-bold text-red-600"
              }
            >
              {pts - card.annualFee >= 0 ? "+" : ""}
              {formatMoney(pts - card.annualFee)}/yr
            </span>{" "}
            on this category alone
          </>
        )}
        .
      </p>
    </Panel>
  );
}

function RelatedCards({
  card,
  all,
}: {
  card: PublicCard;
  all: PublicCard[];
}) {
  const names = allCardNamesFromJson();
  const map = buildSlugMap(names);
  const related = all
    .filter((c) => c.name !== card.name && c.issuer === card.issuer)
    .slice(0, 4);
  if (related.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-slate-900">
        More from {card.issuer}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((r) => (
          <Link
            key={r.name}
            href={`/cards/${map.get(r.name)}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-brand-300"
          >
            <p className="text-sm font-bold text-slate-900">{r.name}</p>
            <p className="text-xs text-slate-500">
              {formatMoney(r.annualFee)} annual fee · {multipliersSummary(r) || "base rewards"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function CardPage({
  params,
}: {
  params: { slug: string };
}) {
  const card = await getCard(params.slug);
  if (!card) notFound();
  const all = await loadAllCards();

  return (
    <div>
      <PageHeader
        title={card.name}
        subtitle={`${card.issuer}${card.network ? ` · ${card.network}` : ""} — earn rates, perks, fees, and sources.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Annual fee
          </h2>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {formatMoney(card.annualFee)}
          </p>
          {card.foreignTransactionFee && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              ⚠️ Foreign transaction fees apply
            </p>
          )}
        </Panel>
        <Panel>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top earn rate
          </h2>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">
            {(() => {
              const top = Object.entries(card.multipliers)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)[0];
              return top ? `${top[1]}×` : "—";
            })()}
          </p>
          <p className="text-xs text-slate-500">
            {(() => {
              const top = Object.entries(card.multipliers)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)[0];
              return top
                ? `on ${CATEGORY_LABELS[top[0]] ?? top[0].replace(/_/g, " ")}`
                : "no bonus categories";
            })()}
          </p>
        </Panel>
        <Panel>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Perk credits
          </h2>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {card.perks.length}
          </p>
          <p className="text-xs text-slate-500">tracked perks & credits</p>
        </Panel>
      </div>

      <div className="mt-4">
        <EarnExample card={card} />
      </div>

      <Panel className="mt-4">
        <h2 className="text-sm font-bold text-slate-900">Earn rates</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(card.multipliers)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([k, v]) => (
              <span
                key={k}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
              >
                {v}× {CATEGORY_LABELS[k] ?? k.replace(/_/g, " ")}
              </span>
            ))}
          {Object.values(card.multipliers).every((v) => v <= 0) && (
            <span className="text-sm text-slate-500">
              No bonus earn categories in our data.
            </span>
          )}
        </div>
      </Panel>

      {card.perks.length > 0 && (
        <Panel className="mt-4">
          <h2 className="text-sm font-bold text-slate-900">
            Perks & credits ({card.perks.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {card.perks.map((perk: PublicPerk, i: number) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-slate-800">{perk.name}</span>{" "}
                <span className="text-slate-600">
                  — {formatMoney(perk.amountCents)}{" "}
                  {(CADENCE_LABELS as Record<string, string>)[perk.cadence]?.toLowerCase() ??
                    perk.cadence}
                </span>
                {perk.details && (
                  <span className="block text-xs text-slate-500">
                    {perk.details}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Track these in the{" "}
            <Link
              href="/tracker"
              className="font-semibold text-brand-700 hover:underline"
            >
              perk tracker
            </Link>{" "}
            so none expire unused.
          </p>
        </Panel>
      )}

      <Panel className="mt-4">
        <h2 className="text-sm font-bold text-slate-900">Sources</h2>
        {card.sources.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {card.sources.map((src, i) => (
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
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Sources not recorded for this card yet.
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          Card terms change — verify current fees and benefits with the issuer
          before applying.
        </p>
      </Panel>

      <div className="mx-auto mt-4 max-w-sm">
        <ApplyCta cardName={card.name} />
      </div>

      <RelatedCards card={card} all={all} />

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/cards" className="font-semibold text-brand-700 hover:underline">
          ← All cards
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/optimizer" className="font-semibold text-brand-700 hover:underline">
          Spend optimizer
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/advisor" className="font-semibold text-brand-700 hover:underline">
          Purchase advisor
        </Link>
      </div>

      <div className="mt-6">
        <AdvertiserDisclosure />
      </div>
    </div>
  );
}
