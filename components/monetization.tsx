/**
 * Monetization components.
 *
 * IMPORTANT: no real affiliate apply URLs exist yet. ApplyCta renders a
 * disabled placeholder ("Apply link coming soon") until Chris approves real
 * affiliate programs and supplies tracking links. Never hardcode a guessed
 * issuer/affiliate URL here — a wrong link is worse than no link.
 */

export function ApplyCta({ cardName }: { cardName: string }) {
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled
        title={`Application link for the ${cardName} is not live yet`}
        className="w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
      >
        Apply link coming soon
      </button>
      <p className="mt-1.5 text-center text-[11px] text-slate-400">
        We&apos;re finalizing application links — check back soon.
      </p>
    </div>
  );
}

/**
 * Advertiser disclosure shown on every page that will carry affiliate CTAs.
 * Required by affiliate network terms and FTC endorsement guidelines once
 * paid links go live; shown now so the layout is final.
 */
export function AdvertiserDisclosure({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={
        compact
          ? "text-[11px] leading-relaxed text-slate-400"
          : "rounded-xl bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500"
      }
    >
      <span className="font-semibold text-slate-600">
        Advertiser disclosure:
      </span>{" "}
      maximusPoints may earn a commission when you apply for a card through
      links on this page. Rankings are computed from public earn rates and
      fees — never from who pays us. Not financial advice; check the
      issuer&apos;s site for current terms.
    </p>
  );
}
