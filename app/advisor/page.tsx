import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cards } from "@/drizzle/schema";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import AdvisorClient from "@/components/AdvisorClient";
import type { OptimizerCard } from "@/components/OptimizerClient";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  let list: OptimizerCard[] = [];
  try {
    const db = getDb();
    const rows = await db.query.cards.findMany({
      orderBy: [desc(cards.annualFee)],
    });
    list = rows.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      annualFee: c.annualFee,
      multipliersJson: c.multipliersJson,
    }));
  } catch (err) {
    console.error("Failed to load cards:", (err as Error).message);
  }

  return (
    <div>
      <PageHeader
        title="Purchase advisor"
        subtitle="Describe what you're buying and we'll detect the category and rank the best cards."
      />
      {list.length === 0 ? (
        <SeedEmptyState feature="advisor" />
      ) : (
        <AdvisorClient cards={list} />
      )}
    </div>
  );
}
