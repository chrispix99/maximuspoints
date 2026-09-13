"use client";

import { useMemo, useState } from "react";
import { Panel, SortSelect } from "@/components/ui";

export interface PortalRow {
  merchant: string;
  portal: string;
  program: string | null;
  rate: number;
  url: string | null;
  checkedAt: string | null;
}

type SortKey = "rate" | "merchant" | "portal";

export default function PortalsClient({ rows }: { rows: PortalRow[] }) {
  const [search, setSearch] = useState("");
  const [portal, setPortal] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("rate");

  const portalNames = useMemo(
    () => [...new Set(rows.map((r) => r.portal))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        (portal === "all" || r.portal === portal) &&
        (!q ||
          r.merchant.toLowerCase().includes(q) ||
          r.portal.toLowerCase().includes(q)),
    );
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "merchant":
          return a.merchant.localeCompare(b.merchant);
        case "portal":
          return (
            a.portal.localeCompare(b.portal) || b.rate - a.rate
          );
        case "rate":
        default:
          return b.rate - a.rate || a.merchant.localeCompare(b.merchant);
      }
    });
    return out;
  }, [rows, search, portal, sort]);

  const checkedAt = rows.find((r) => r.checkedAt)?.checkedAt;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchants or portals…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        />
        <select
          value={portal}
          onChange={(e) => setPortal(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by portal"
        >
          <option value="all">All portals ({portalNames.length})</option>
          {portalNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <SortSelect
          id="portals-sort"
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "rate", label: "Highest rate" },
            { value: "merchant", label: "Merchant A–Z" },
            { value: "portal", label: "Portal" },
          ]}
        />
      </div>

      {checkedAt && (
        <p className="mb-3 text-xs text-slate-400">
          Portal rates change often — last checked {checkedAt}.{" "}
          {filtered.length} of {rows.length} listings shown.
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((r) => (
          <Panel
            key={`${r.portal}::${r.merchant}`}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {r.merchant}
              </p>
              <p className="truncate text-xs text-slate-500">
                {r.portal}
                {r.program ? ` · ${r.program}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-brand-600 px-3 py-1 text-sm font-bold text-white">
                +{r.rate}/$
              </span>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  Shop →
                </a>
              )}
            </div>
          </Panel>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No portal bonuses match that search.
          </p>
        )}
      </div>
    </div>
  );
}
