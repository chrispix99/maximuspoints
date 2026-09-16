import Link from "next/link";
import { auth } from "@/lib/auth";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { Panel } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/cards",
    icon: "🃏",
    title: "Card Database",
    text: "Browse premium and mid-tier cards — fees, earn multipliers, perk credits, and sources.",
  },
  {
    href: "/optimizer",
    icon: "📊",
    title: "Spend Optimizer",
    text: "Pick a category and monthly spend. See which card earns the most, net of annual fees.",
  },
  {
    href: "/advisor",
    icon: "🧠",
    title: "Purchase Advisor",
    text: "Tell us what you're buying — “gas at Costco”, “Alaska Airlines flight” — and get the best card for it.",
  },
  {
    href: "/calculator",
    icon: "🧮",
    title: "Balance Transfer Calculator",
    text: "Compare interest with vs. without a 0% intro transfer, with a full month-by-month payoff table.",
  },
  {
    href: "/tracker",
    icon: "✅",
    title: "Perk Tracker",
    text: "Track airline, hotel, and dining credits across your cards so none expire unused.",
  },
];

export default async function Home() {
  const session = await auth().catch(() => null);

  return (
    <div>
      <section className="py-6 text-center sm:py-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Squeeze every point out of{" "}
          <span className="text-brand-600">every dollar</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          maximusPoints compares credit cards by real earn math, tells you which
          card to swipe for each purchase, and makes sure you never leave a
          perk credit on the table.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/optimizer"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Optimize my spend
          </Link>
          <Link
            href="/cards"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Browse cards
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Panel className="h-full transition hover:shadow-md hover:ring-brand-200">
              <div className="text-3xl">{s.icon}</div>
              <h2 className="mt-2 text-base font-bold text-slate-900">
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </Panel>
          </Link>
        ))}
        <Panel className="bg-gradient-to-br from-brand-50 to-white">
          <div className="text-3xl">🏦</div>
          <h2 className="mt-2 text-base font-bold text-slate-900">
            Connect your accounts
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Link your bank and cards through Plaid to see balances alongside
            your rewards strategy.
          </p>
          <div className="mt-3">
            {session?.user ? (
              <PlaidLinkButton />
            ) : (
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Sign in to connect
              </Link>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
