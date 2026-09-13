"use client";

import { useEffect, useState } from "react";
import { Panel } from "./ui";
import PlaidLinkButton from "./PlaidLinkButton";
import type { SyncedAccount } from "@/app/api/plaid/accounts/route";

const fmtMoney = (n: number | null, currency: string | null) =>
  n === null
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: currency ?? "USD",
      });

export default function AccountsClient() {
  const [accounts, setAccounts] = useState<SyncedAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/plaid/accounts");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setAccounts(data.accounts);
    } catch {
      setError("Could not load accounts. Please try again.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <Panel>
        <PlaidLinkButton onLinked={load} />
      </Panel>

      {error && (
        <Panel className="border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Panel>
      )}

      {accounts === null && !error && (
        <p className="text-center text-sm text-slate-500">
          Loading your synced accounts…
        </p>
      )}

      {accounts !== null && accounts.length === 0 && (
        <Panel className="text-center text-sm text-slate-500">
          No accounts connected yet. Use the button above to link your bank
          through Plaid.
        </Panel>
      )}

      {accounts !== null && accounts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <Panel key={a.accountId}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-900">
                    {a.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {[a.subtype ?? a.type, a.mask ? `••••${a.mask}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Current balance</dt>
                  <dd className="font-semibold text-slate-900">
                    {fmtMoney(a.balances.current, a.balances.isoCurrencyCode)}
                  </dd>
                </div>
                {a.balances.available !== null && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Available</dt>
                    <dd className="font-medium text-slate-700">
                      {fmtMoney(
                        a.balances.available,
                        a.balances.isoCurrencyCode,
                      )}
                    </dd>
                  </div>
                )}
                {a.balances.limit !== null && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Limit</dt>
                    <dd className="font-medium text-slate-700">
                      {fmtMoney(a.balances.limit, a.balances.isoCurrencyCode)}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
