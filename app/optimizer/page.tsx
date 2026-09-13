import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cards } from "@/drizzle/schema";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import OptimizerClient, {
  type OptimizerCard,
} from "@/components/OptimizerClient";

export const dynamic = "force-dynamic";

export default async function OptimizerPage() {
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
        title="Spend optimizer"
        subtitle="Rank every card for a spend category — earn math shown per card, net of annual fee."
      />
      {list.length === 0 ? (
        <SeedEmptyState feature="optimizer" />
      ) : (
        <OptimizerClient cards={list} />
      )}
    </div>
  );
}
