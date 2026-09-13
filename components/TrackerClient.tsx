"use client";

import { useMemo, useState } from "react";
import { Panel } from "./ui";
import { formatMoney } from "@/lib/card-math";
import {
  currentPeriodKey,
  isExpiringSoon,
  periodEndDate,
  CADENCE_LABELS,
} from "@/lib/periods";
import type { PerkCadence } from "@/drizzle/schema";

export interface TrackerPerk {
  id: string;
  cardId: string;
  cardName: string;
  name: string;
  amountCents: number;
  cadence: PerkCadence;
  details: string | null;
  usedAmountCents: number;
}

export interface TrackerCard {
  id: string;
  name: string;
  issuer: string;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${
          clamped >= 100 ? "bg-green-500" : "bg-brand-500"
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function PerkRow({
  perk,
  onSaved,
}: {
  perk: TrackerPerk;
  onSaved: (perkId: string, used: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((perk.usedAmountCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  const pct = (perk.usedAmountCents / perk.amountCents) * 100;
  const remaining = perk.amountCents - perk.usedAmountCents;
  const periodKey = currentPeriodKey(perk.cadence);
  const endDate = periodEndDate(perk.cadence, periodKey);
  const soon = isExpiringSoon(perk.cadence, periodKey) && remaining > 0;

  const save = async () => {
    const cents = Math.round(Number(draft) * 100);
    if (!Number.isInteger(cents) || cents < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tracker/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perkId: perk.id, usedAmountCents: cents }),
      });
      if (res.ok) onSaved(perk.id, cents);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{perk.name}</p>
          <p className="text-xs text-slate-500">
            {perk.cardName} · {CADENCE_LABELS[perk.cadence]} · period {periodKey}
            {" · "}ends {endDate.toLocaleDateString("en-US")}
          </p>
          {perk.details && (
            <p className="mt-0.5 text-xs text-slate-400">{perk.details}</p>
          )}
        </div>
        {soon && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            ⏰ expiring soon
          </span>
        )}
        {pct >= 100 && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
            ✓ maxed
          </span>
        )}
      </div>

      <div className="mt-2">
        <ProgressBar pct={pct} />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
          <span>
            {formatMoney(perk.usedAmountCents)} of{" "}
            {formatMoney(perk.amountCents)} used
          </span>
          <span className="font-medium text-brand-700">
            {formatMoney(Math.max(0, remaining))} left
          </span>
        </div>
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Amount used in dollars"
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft((perk.usedAmountCents / 100).toFixed(2));
            setEditing(true);
          }}
          className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          Update used amount
        </button>
      )}
    </div>
  );
}

export default function TrackerClient({
  perks,
  cards,
  selectedCardIds,
}: {
  perks: TrackerPerk[];
  cards: TrackerCard[];
  selectedCardIds: string[];
}) {
  const [localPerks, setLocalPerks] = useState(perks);
  const [selected, setSelected] = useState<string[]>(selectedCardIds);
  const [savingCards, setSavingCards] = useState(false);
  const [cardsSaved, setCardsSaved] = useState(false);

  const visiblePerks = useMemo(
    () => localPerks.filter((p) => selected.includes(p.cardId)),
    [localPerks, selected],
  );

  const expiring = useMemo(
    () =>
      visiblePerks.filter(
        (p) =>
          p.usedAmountCents < p.amountCents &&
          isExpiringSoon(p.cadence, currentPeriodKey(p.cadence)),
      ),
    [visiblePerks],
  );

  const totalLeft = visiblePerks.reduce(
    (s, p) => s + Math.max(0, p.amountCents - p.usedAmountCents),
    0,
  );

  const toggleCard = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const saveCards = async () => {
    setSavingCards(true);
    try {
      const res = await fetch("/api/tracker/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: selected }),
      });
      if (res.ok) setCardsSaved(true);
    } finally {
      setSavingCards(false);
      setTimeout(() => setCardsSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="text-base font-bold text-slate-900">My cards</h2>
        <p className="mb-3 text-sm text-slate-500">
          Pick the cards you hold to track their perk credits.
        </p>
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const active = selected.includes(card.id);
            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  active
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-slate-600 ring-slate-300 hover:ring-brand-300"
                }`}
              >
                {active ? "✓ " : ""}
                {card.name}
              </button>
            );
          })}
        </div>
        <button
          onClick={saveCards}
          disabled={savingCards}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {savingCards ? "Saving…" : cardsSaved ? "✓ Saved" : "Save my cards"}
        </button>
      </Panel>

      {expiring.length > 0 && (
        <Panel className="border-amber-300 bg-amber-50">
          <h2 className="text-base font-bold text-amber-900">
            ⏰ Expiring soon
          </h2>
          <p className="mb-3 text-sm text-amber-800">
            These credits reset within 30 days — use them or lose them.
          </p>
          <div className="space-y-2">
            {expiring.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-amber-200"
              >
                <span className="font-medium text-slate-800">
                  {p.name}{" "}
                  <span className="font-normal text-slate-500">
                    ({p.cardName})
                  </span>
                </span>
                <span className="font-bold text-amber-800">
                  {formatMoney(p.amountCents - p.usedAmountCents)} left
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Perk credits</h2>
          <span className="text-sm font-semibold text-brand-700">
            {formatMoney(totalLeft)} unclaimed
          </span>
        </div>
        {visiblePerks.length === 0 ? (
          <p className="text-sm text-slate-500">
            Select at least one card above to see its perk credits here.
          </p>
        ) : (
          <div className="space-y-3">
            {visiblePerks.map((perk) => (
              <PerkRow
                key={perk.id}
                perk={perk}
                onSaved={(perkId, used) =>
                  setLocalPerks((prev) =>
                    prev.map((p) =>
                      p.id === perkId ? { ...p, usedAmountCents: used } : p,
                    ),
                  )
                }
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
