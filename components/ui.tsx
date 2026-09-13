import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/** Shown when the card database hasn't been seeded yet. */
export function SeedEmptyState({ feature }: { feature: string }) {
  return (
    <Panel className="text-center">
      <div className="mx-auto max-w-md py-8">
        <div className="text-4xl">🃏</div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          No cards in the database yet
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The {feature} needs card data to work. Ask whoever runs this app to
          seed the database:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-100">
          npm run db:migrate{"\n"}npm run db:seed
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          The seed script reads{" "}
          <code>../maximuspoints-research/cards_premium.json</code> and{" "}
          <code>cards_midtier.json</code>.
        </p>
      </div>
    </Panel>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-amber-100 text-amber-800 ring-amber-300"
      : rank === 2
        ? "bg-slate-200 text-slate-700 ring-slate-300"
        : rank === 3
          ? "bg-orange-100 text-orange-800 ring-orange-300"
          : "bg-slate-100 text-slate-500 ring-slate-200";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ring-1 ${styles}`}
    >
      {rank}
    </span>
  );
}
