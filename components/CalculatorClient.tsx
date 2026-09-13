"use client";

import { useMemo, useState } from "react";
import { Panel } from "./ui";

interface Row {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/** Amortize a balance over `months` at a fixed APR with equal payments. */
function amortize(
  balance: number,
  aprPct: number,
  months: number,
  introZeroMonths = 0,
): { rows: Row[]; totalInterest: number; totalPaid: number } {
  const monthlyRate = aprPct / 100 / 12;
  // Equal payment that would amortize at the full APR (used as the budget).
  const payment =
    monthlyRate > 0
      ? (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
      : balance / months;

  const rows: Row[] = [];
  let bal = balance;
  let totalInterest = 0;
  for (let m = 1; m <= months && bal > 0.01; m++) {
    const rate = m <= introZeroMonths ? 0 : monthlyRate;
    const interest = bal * rate;
    const principal = Math.min(payment - interest, bal);
    const actualPayment = interest + principal;
    bal = Math.max(0, bal - principal);
    totalInterest += interest;
    rows.push({
      month: m,
      payment: actualPayment,
      interest,
      principal,
      balance: bal,
    });
  }
  return { rows, totalInterest, totalPaid: rows.reduce((s, r) => s + r.payment, 0) };
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-1">
        <input
          type="number"
          min={min ?? 0}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CalculatorClient() {
  const [balance, setBalance] = useState(5000);
  const [apr, setApr] = useState(24.99);
  const [introMonths, setIntroMonths] = useState(18);
  const [feePct, setFeePct] = useState(3);
  const [payoffMonths, setPayoffMonths] = useState(18);

  const result = useMemo(() => {
    const months = Math.max(1, Math.round(payoffMonths));
    const without = amortize(balance, apr, months, 0);
    const fee = balance * (feePct / 100);
    const withTransfer = amortize(balance + fee, apr, months, Math.min(introMonths, months));
    const totalWith = fee + withTransfer.totalInterest;
    const savings = without.totalInterest - totalWith;
    return { without, withTransfer, fee, totalWith, savings };
  }, [balance, apr, introMonths, feePct, payoffMonths]);

  const verdict = result.savings > 0;

  return (
    <div>
      <Panel className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumField label="Balance to transfer" value={balance} onChange={setBalance} step={100} suffix="$" />
          <NumField label="Current APR" value={apr} onChange={setApr} step={0.01} suffix="%" />
          <NumField label="Intro 0% period" value={introMonths} onChange={setIntroMonths} suffix="mo" />
          <NumField label="Transfer fee" value={feePct} onChange={setFeePct} step={0.1} suffix="%" />
          <NumField label="Payoff timeline" value={payoffMonths} onChange={setPayoffMonths} suffix="mo" />
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Interest without transfer
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {fmt(result.without.totalInterest)}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cost with transfer
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {fmt(result.totalWith)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {fmt(result.fee)} fee + {fmt(result.withTransfer.totalInterest)} interest
          </p>
        </Panel>
        <Panel className={verdict ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net savings
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${verdict ? "text-green-700" : "text-red-700"}`}
          >
            {verdict ? "+" : "−"}
            {fmt(Math.abs(result.savings))}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {verdict
              ? "✅ Worth it — the transfer saves you money."
              : "❌ Skip it — the transfer costs more than it saves."}
          </p>
        </Panel>
      </div>

      <Panel className="mt-6">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          Month-by-month payoff (with transfer)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Month</th>
                <th className="py-2 pr-2 text-right">Payment</th>
                <th className="py-2 pr-2 text-right">Interest</th>
                <th className="py-2 pr-2 text-right">Principal</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {result.withTransfer.rows.map((r) => (
                <tr
                  key={r.month}
                  className={r.month % 2 ? "bg-slate-50/60" : undefined}
                >
                  <td className="py-1.5 pr-2">
                    {r.month}
                    {r.month <= introMonths && (
                      <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                        0%
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{fmt(r.payment)}</td>
                  <td className="py-1.5 pr-2 text-right">{fmt(r.interest)}</td>
                  <td className="py-1.5 pr-2 text-right">{fmt(r.principal)}</td>
                  <td className="py-1.5 text-right font-medium">
                    {fmt(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Assumes equal monthly payments that would pay off the balance in the
          chosen timeline at the current APR. Post-intro APR is assumed equal
          to your current APR.
        </p>
      </Panel>
    </div>
  );
}
