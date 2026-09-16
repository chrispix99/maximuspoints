# maximusPoints — Affiliate Program Application Checklist

**Status: DRAFT — nothing has been applied to. Chris applies; the site is already wired for it.**
**Last researched: Sep 15, 2026. Verify current terms at application time.**

## How the site is ready

- Every card surface (database, per-card review pages, `/alaska` landing page)
  renders an `ApplyCta` placeholder: a disabled **"Apply link coming soon"**
  button. Swap in real tracking URLs once programs approve — zero fake links
  shipped.
- Advertiser disclosure is live site-wide (footer + card pages): *"rankings are
  computed from public earn rates and fees — never from who pays us."*
- Per-card review pages (`/cards/[slug]`, 154 of them) give each program a
  dedicated landing URL to submit in applications.

## Priority 1 — apply this week (biggest payouts)

| Program | Where to apply | Expected payout (verify at signup) | Notes |
|---|---|---|---|
| American Express affiliate program | Amex's own affiliate portal (search "American Express affiliate program") | ~$25–$200 per approved application depending on card | High match: Platinum/Gold/Green cards are core to the database |
| Bank of America (Atmos Rewards cards) | FlexOffers network | Historically ~$120 per credit card approval | Critical for the `/alaska` niche page — Ascent/Summit are BofA cards |
| Impact marketplace — card issuers | impact.com (free for publishers) | Varies by brand; card programs typically $25–$100+ per approved app | Apply to 3–5 programs max to start; approval is per-brand |

## Priority 2 — networks (breadth)

| Network | Why | Publisher terms (verified Sep 2026) |
|---|---|---|
| **FlexOffers** | 12,000+ advertiser programs; 80+ financial institutions; card payouts are per *approved application* (e.g. $40.50 First Progress, $22.50 Surge — lower-tier cards, premium cards pay more) | Publisher approval ~1–2 days; standard payout Net 60 (Net 30/Net 7 for qualified); ACH/PayPal/wire |
| **Impact** | 250,000+ brands; first-party tracking (no third-party-cookie dependence); single consolidated payout | Free for publishers; 30–90 day locking period for fraud/returns; $10 payout minimum; bank transfer or PayPal |

## What Chris needs for applications

1. The live site URL: `https://maximuspoints-chris-picks-projects.vercel.app`
2. Traffic sources: organic SEO (154 per-card pages + sitemap), Reddit/community, YouTube Shorts
3. Promotional method: editorial tool — rankings computed from earn math, disclosure on every page
4. Tax form: networks require W-9 (US) before first payout — have it ready
5. One network account each at FlexOffers and Impact covers most issuers; add direct programs (Amex) individually

## Compliance (non-negotiable — programs will ban for this)

- ✅ Disclosure already on site; keep it on any page with an apply link
- ✅ Never claim a card "approves everyone" or guarantee approval
- ✅ Never bid on issuer brand keywords in paid search unless the program allows it (most prohibit brand bidding)
- ✅ "Not financial advice" footer stays
- Re-check each program's terms at signup — cookie windows, brand-bidding rules, and payout rates change

## After first approval

1. Replace `ApplyCta` placeholder with the real tracking link (component takes a URL prop — one-line change per surface, or a single env-driven mapping)
2. Submit the per-card URLs + `/alaska` page in the program dashboard as promotional placements
3. Watch EPC (earnings per click) per program in the network dashboard; drop underperformers after ~1,000 clicks
