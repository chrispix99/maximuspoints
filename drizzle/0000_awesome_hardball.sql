CREATE TYPE "public"."perk_cadence" AS ENUM('monthly', 'quarterly', 'semiannual', 'annual');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "perk_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"perkId" text NOT NULL,
	"periodKey" text NOT NULL,
	"usedAmountCents" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perks" (
	"id" text PRIMARY KEY NOT NULL,
	"cardId" text NOT NULL,
	"name" text NOT NULL,
	"amountCents" integer NOT NULL,
	"cadence" "perk_cadence" NOT NULL,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"plaidItemId" text NOT NULL,
	"accessTokenEncrypted" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_items_plaidItemId_unique" UNIQUE("plaidItemId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"cardId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_progress" ADD CONSTRAINT "perk_progress_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_progress" ADD CONSTRAINT "perk_progress_perkId_perks_id_fk" FOREIGN KEY ("perkId") REFERENCES "public"."perks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perks" ADD CONSTRAINT "perks_cardId_cards_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_cardId_cards_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cards_name_idx" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "perk_progress_user_perk_period_idx" ON "perk_progress" USING btree ("userId","perkId","periodKey");--> statement-breakpoint
CREATE UNIQUE INDEX "user_cards_user_card_idx" ON "user_cards" USING btree ("userId","cardId");