CREATE TABLE "portal_merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"portal" text NOT NULL,
	"program" text,
	"merchant" text NOT NULL,
	"miles_per_dollar" real NOT NULL,
	"portal_url" text,
	"source_url" text,
	"checked_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "portal_merchant_idx" ON "portal_merchants" USING btree ("portal","merchant");