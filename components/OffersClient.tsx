"use client";

import { useMemo, useState } from "react";
import { Panel, SortSelect } from "@/components/ui";
import type { Offer } from "@/lib/offers";

type SortKey = "expires" | "merchant" | "network";

function daysLeft(expires: string): number {
  const [y, m, d] = expires.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - now.getTime()) / 86400000);
}

export default function OffersClient({ offers }: { offers: Offer[] }) {
  const [search, setSearch] = useState("");
  const [network, setNetwork] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("expires");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = offers.filter(
      (o) =>
        (network === "all" || o.network === network) &&
        (!q ||
          o.merchant.toLowerCase().includes(q) ||
          o.headline.toLowerCase().includes(q) ||
          o.details.toLowerCase().includes(q)),
    );
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "merchant":
          return a.merchant.localeCompare(b.merchant);
        case "network":
          return a.network.localeCompare(b.network) || a.expires.localeCompare(b.expires);
        case "expires":
        default:
          return a.expires.localeCompare(b.expires) || a.merchant.localeCompare(b.merchant);
      }
    });
    return out;
  }, [offers, search, network, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchants or offers…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by network"
        >
          <option value="all">Amex + Chase</option>
          <option value="amex">Amex Offers</option>
          <option value="chase">Chase Offers</option>
        </select>
        <SortSelect
          id="offers-sort"
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "expires", label: "Expiring soon" },
            { value: "merchant", label: "Merchant A–Z" },
            { value: "network", label: "Network" },
          ]}
        />
      </div>

      <p className="mb-3 text-xs text-slate-400">
        {filtered.length} of {offers.length} active offers shown. Enroll in your
        banking app before buying — most require enrollment to trigger.
      </p>

      <div className="space-y-2">
        {filtered.map((o, i) => {
          const left = daysLeft(o.expires);
          return (
            <Panel
              key={`${o.network}::${o.merchant}::${o.headline}::${i}`}
              className="flex items-start justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {o.merchant}{" "}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      o.network === "amex"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {o.network === "amex" ? "Amex" : "Chase"}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-slate-700">{o.headline}</p>
                <p className="mt-0.5 text-xs text-slate-500">{o.details}</p>
                {o.source_url && (
                  <a
                    href={o.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Source →
                  </a>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    left <= 14
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {left < 0 ? "Expired" : left === 0 ? "Ends today" : `${left}d left`}
                </span>
                <p className="mt-1 text-[11px] text-slate-400">
                  ends {o.expires}
                </p>
              </div>
            </Panel>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No offers match that search.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Offers are compiled from public roundups (Doctor of Credit, The Points
        Guy, Frequent Miler). Your account may show different or targeted
        offers — always check the Offers tab in your Amex or Chase app. Offers
        usually stack with portal click-throughs.
      </p>
    </div>
  );
}
