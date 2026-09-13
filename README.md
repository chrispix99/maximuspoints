# maximusPoints

A credit card rewards optimizer: browse a card database, rank cards by real
earn math for your spend, get purchase advice, model balance transfers, track
perk credits so none expire, and sync bank balances via Plaid.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS · Drizzle ORM
with `@neondatabase/serverless` · Auth.js v5 (Google OAuth + Resend magic
links, DB sessions) · Plaid (`plaid` npm package + `react-plaid-link`).

## Features

| Route          | What it does |
| -------------- | ------------ |
| `/`            | Landing page + Plaid "connect your accounts" for signed-in users |
| `/cards`       | Card database, sorted by annual fee ↓, filterable by issuer; shows fees, multipliers, perks (cadence + amount), source links |
| `/optimizer`   | Pick a spend category + monthly spend → cards ranked by est. annual rewards net of annual fee (1¢/pt) |
| `/advisor`     | Free-text "what should I buy" → keyword category detection → ranked cards + quick-pick buttons |
| `/calculator`  | Balance transfer calculator: interest with vs. without transfer, net-savings verdict, month-by-month amortization table |
| `/tracker`     | Login required: pick your cards, track perk-credit usage per period with progress bars and an "expiring soon" section |
| `/accounts`    | Login required: balances of accounts synced via Plaid |

## Local dev

```bash
cd maximuspoints
cp .env.example .env   # fill in values (see below)
npm install
npm run db:migrate     # apply Drizzle migrations
npm run db:seed        # load card data from ./data/*.json
npm run dev            # http://localhost:3000
```

`npm run build` must pass (typecheck-clean) before deploying.

## Deploy to Vercel

1. **Database:** create a Postgres database — either
   [Neon](https://neon.tech) (recommended) or Vercel Postgres — and copy the
   pooled connection string.
2. **Push the repo** to GitHub and import it in Vercel.
3. **Environment variables** (Vercel → Project → Settings → Environment
   Variables): set every key from `.env.example`:
   - `DATABASE_URL`
   - `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_URL` = your production URL
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (add the production URL +
     `/api/auth/callback/google` as an authorized redirect URI in Google Cloud)
   - `RESEND_API_KEY`, `EMAIL_FROM` (a domain-verified sender)
   - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
   - `ENCRYPTION_KEY` (`openssl rand -hex 32`)
4. **Migrate + seed** (one-time, from your machine with the production
   `DATABASE_URL`):
   ```bash
   DATABASE_URL="<prod-url>" npm run db:migrate
   DATABASE_URL="<prod-url>" npm run db:seed
   ```

## Seed data format

`npm run db:seed` reads `../maximuspoints-research/cards_premium.json`,
`../maximuspoints-research/cards_midtier.json`, and
`./data/cards_gapfill.json` (each a JSON array of card
objects or `{"cards": [...]}`), merges them, dedupes by card name, and
upserts into `cards` + `perks`. Missing files produce a clear error instead
of a silent no-op. Snake_case keys (`annual_fee`, `foreign_transaction_fee`)
and a `benefits` alias for `perks` are accepted. Validate without a database
via `npm run db:seed -- --dry-run`.

```jsonc
[
  {
    "name": "Chase Sapphire Reserve",
    "issuer": "Chase",
    "network": "Visa",
    "annualFee": 550,              // dollars → stored as cents (or use annualFeeCents)
    "foreignTransactionFee": false,
    "multipliers": {               // points per dollar
      "dining": 3, "groceries": 1, "gas": 1, "travel": 3,
      "flights": 5, "hotels": 5, "everyday": 1, "alaska_airlines": 1
    },
    "perks": [
      { "name": "$300 travel credit", "amount": 300,   // dollars → cents (or amountCents)
        "cadence": "annual",                            // monthly|quarterly|semiannual|annual
        "details": "…" }
    ],
    "sources": ["https://…"]
  }
]
```

## Security notes

- **Plaid access tokens are encrypted at rest** with AES-256-GCM
  (`lib/crypto.ts`, key from `ENCRYPTION_KEY`) and stored in `plaid_items`.
- **Tokens are never logged** — API routes log only error messages, never
  request/response bodies containing token material; tokens are decrypted in
  memory only for the Plaid call.
- **All Plaid credentials come from environment variables only.** There are
  no secrets in code, config, or git history.
- Auth.js uses database sessions; `/tracker`, `/accounts`, and all
  `/api/plaid/*` + `/api/tracker/*` routes require a signed-in user.

## Project layout

```
app/            pages + API routes (App Router)
  api/plaid/    create-link-token, exchange, accounts
  api/tracker/  progress, cards
  api/auth/     Auth.js handlers
components/     client components (PlaidLinkButton, OptimizerClient, …)
lib/            db, auth, plaid, crypto, card-math, category-detect, periods
drizzle/        schema.ts + generated migrations
scripts/        seed.ts, migrate.ts (run with tsx)
```
