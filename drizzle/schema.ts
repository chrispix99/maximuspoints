import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Auth.js v5 (next-auth@beta) adapter tables.
// Table names are singular per the @auth/drizzle-adapter convention.
// ---------------------------------------------------------------------------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

// ---------------------------------------------------------------------------
// maximusPoints domain tables
// ---------------------------------------------------------------------------

/** Plaid Item linked to a user. The access token is stored AES-256-GCM
 *  encrypted (see lib/crypto.ts) and is NEVER logged anywhere. */
export const plaidItems = pgTable("plaid_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: text("plaidItemId").notNull().unique(),
  accessTokenEncrypted: text("accessTokenEncrypted").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/** Earn multipliers per category, stored as JSON:
 *  { dining, groceries, gas, travel, flights, hotels, everyday,
 *    alaska_airlines } — values are points per dollar. */
export interface CardMultipliers {
  dining?: number;
  groceries?: number;
  gas?: number;
  travel?: number;
  flights?: number;
  hotels?: number;
  everyday?: number;
  alaska_airlines?: number;
}

export const cards = pgTable(
  "cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(),
    issuer: text("issuer").notNull(),
    network: text("network"),
    annualFee: integer("annualFee").notNull().default(0), // cents
    foreignTransactionFee: boolean("foreignTransactionFee")
      .notNull()
      .default(false),
    multipliersJson: jsonb("multipliersJson")
      .$type<CardMultipliers>()
      .notNull()
      .default({}),
    sourcesJson: jsonb("sourcesJson").$type<string[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("cards_name_idx").on(t.name)],
);

export const perkCadence = pgEnum("perk_cadence", [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export type PerkCadence = "monthly" | "quarterly" | "semiannual" | "annual";

export const perks = pgTable("perks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("cardId")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amountCents: integer("amountCents").notNull(), // per period
  cadence: perkCadence("cadence").notNull(),
  details: text("details"),
});

/** Tracks how much of a perk a user has used in a given period.
 *  periodKey examples: "2026-09" (monthly), "2026-Q3" (quarterly),
 *  "2026-H1" (semiannual), "2026" (annual). */
export const perkProgress = pgTable(
  "perk_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    perkId: text("perkId")
      .notNull()
      .references(() => perks.id, { onDelete: "cascade" }),
    periodKey: text("periodKey").notNull(),
    usedAmountCents: integer("usedAmountCents").notNull().default(0),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("perk_progress_user_perk_period_idx").on(t.userId, t.perkId, t.periodKey)],
);

/** Cards a user actually holds (powers the /tracker page). */
export const userCards = pgTable(
  "user_cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("cardId")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_cards_user_card_idx").on(t.userId, t.cardId)],
);

// ---------------------------------------------------------------------------
// Shopping portal bonuses: merchant × portal earn rates (miles/pts per $1),
// stacked on top of credit card earnings. Refreshed by the monthly job.
// ---------------------------------------------------------------------------

export const portalMerchants = pgTable(
  "portal_merchants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    portal: text("portal").notNull(), // e.g. "Alaska Mileage Plan Shopping"
    program: text("program"), // currency earned, e.g. "Atmos Rewards points"
    merchant: text("merchant").notNull(), // clean display name, e.g. "Nike"
    milesPerDollar: real("miles_per_dollar").notNull(),
    elevated: boolean("elevated").notNull().default(false), // limited-time boosted rate
    note: text("note"), // e.g. "United cardholder rate", "up to max rate"
    portalUrl: text("portal_url"),
    sourceUrl: text("source_url"),
    checkedAt: timestamp("checked_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("portal_merchant_idx").on(t.portal, t.merchant)],
);

export type PortalMerchant = typeof portalMerchants.$inferSelect;

// ---------------------------------------------------------------------------
// Relations (enable db.query.* relational queries)
// ---------------------------------------------------------------------------

export const cardsRelations = relations(cards, ({ many }) => ({
  perks: many(perks),
}));

export const perksRelations = relations(perks, ({ one }) => ({
  card: one(cards, { fields: [perks.cardId], references: [cards.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  plaidItems: many(plaidItems),
  userCards: many(userCards),
  perkProgress: many(perkProgress),
}));
