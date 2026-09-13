/**
 * TEMPORARY one-off bootstrap route: runs DB migrations + card seed on the
 * deployed Vercel environment (which is the only place with DATABASE_URL).
 * Guarded by ?key=<BOOTSTRAP_KEY>. DELETE THIS FILE after bootstrapping.
 */
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getDb } from "@/lib/db";
import { normalizeCardList, seedCards } from "@/lib/card-seed";
import premium from "@/data/cards_premium.json";
import midtier from "@/data/cards_midtier.json";
import gapfill from "@/data/cards_gapfill.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Inlined from drizzle/0000_awesome_hardball.sql (kept here so the route is
// self-contained; drizzle/*.sql may not be file-traced into the bundle).
const MIGRATION_SQL = `
CREATE TYPE "public"."perk_cadence" AS ENUM('monthly', 'quarterly', 'semiannual', 'annual');
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"network" text,
	"annualFee" integer DEFAULT 0 NOT NULL,
	"foreignTransactionFee" boolean DEFAULT false NOT NULL,
	"multipliersJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sourcesJson" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "cards_name_unique" UNIQUE("name")
);
CREATE TABLE "perk_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"perkId" text NOT NULL,
	"periodKey" text NOT NULL,
	"usedAmountCents" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "perks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amountCents" integer NOT NULL,
	"cadence" "perk_cadence" NOT NULL,
	"details" text,
	"cardId" text NOT NULL
);
CREATE TABLE "plaid_items" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"plaidItemId" text NOT NULL,
	"accessTokenEncrypted" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_items_plaidItemId_unique" UNIQUE("plaidItemId")
);
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
CREATE TABLE "user_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"cardId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "perk_progress" ADD CONSTRAINT "perk_progress_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "perk_progress" ADD CONSTRAINT "perk_progress_perkId_perks_id_fk" FOREIGN KEY ("perkId") REFERENCES "public"."perks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "perks" ADD CONSTRAINT "perks_cardId_cards_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_cardId_cards_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX IF NOT EXISTS "cards_name_idx" ON "cards" USING btree ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "perk_progress_user_perk_period_idx" ON "perk_progress" USING btree ("userId","perkId","periodKey");
CREATE UNIQUE INDEX IF NOT EXISTS "user_cards_user_card_idx" ON "user_cards" USING btree ("userId","cardId");
`;

function authorized(req: NextRequest): boolean {
  const key = process.env.BOOTSTRAP_KEY;
  if (!key) return false;
  const got = req.nextUrl.searchParams.get("key") ?? "";
  if (got.length !== key.length || got.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) {
    diff |= key.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  // 1) Migrations (idempotent: IF NOT EXISTS / fresh DB).
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const statements = MIGRATION_SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      // CREATE TYPE fails if it already exists — tolerate it.
      try {
        await pool.query(stmt);
      } catch (err) {
        const msg = (err as Error).message;
        if (!/already exists/i.test(msg)) throw err;
      }
    }
  } finally {
    await pool.end();
  }

  // 2) Seed cards (upsert by name, perks replaced — idempotent).
  const cards = normalizeCardList([
    { label: "cards_premium.json", parsed: premium },
    { label: "cards_midtier.json", parsed: midtier },
    { label: "cards_gapfill.json", parsed: gapfill },
  ]);
  const result = await seedCards(getDb(), cards);

  return NextResponse.json({
    ok: true,
    migrated: true,
    cards: result.cards,
    perks: result.perks,
  });
}
