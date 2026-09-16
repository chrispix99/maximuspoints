import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cards } from "@/drizzle/schema";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import CardsClient, { type CardWithPerks } from "@/components/CardsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/cards" },
};

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  let rows: CardWithPerks[];
  try {
    const db = getDb();
    const cardRows = await db.query.cards.findMany({
      orderBy: [desc(cards.annualFee)],
      with: { perks: true },
    });
    rows = cardRows.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      network: c.network,
      annualFee: c.annualFee,
      foreignTransactionFee: c.foreignTransactionFee,
      multipliersJson: c.multipliersJson,
      sourcesJson: c.sourcesJson,
      perks: c.perks.map((p) => ({
        id: p.id,
        name: p.name,
        amountCents: p.amountCents,
        cadence: p.cadence,
        details: p.details,
      })),
    }));
  } catch (err) {
    console.error("Failed to load cards:", (err as Error).message);
    rows = [];
  }

  return (
    <div>
      <PageHeader
        title="Card database"
        subtitle="Premium and mid-tier cards, sorted by annual fee. Filter by issuer."
      />
      {rows.length === 0 ? (
        <SeedEmptyState feature="card database" />
      ) : (
        <CardsClient cards={rows} />
      )}
    </div>
  );
}
