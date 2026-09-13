import { getDb } from "@/lib/db";
import { portalMerchants } from "@/drizzle/schema";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import PortalsClient, {
  type PortalRow,
} from "@/components/PortalsClient";

export const dynamic = "force-dynamic";

export default async function PortalsPage() {
  let rows: PortalRow[] = [];
  try {
    const db = getDb();
    const prows = await db.select().from(portalMerchants);
    rows = prows.map((r) => ({
      merchant: r.merchant,
      portal: r.portal,
      program: r.program,
      rate: r.milesPerDollar,
      url: r.portalUrl,
      checkedAt: r.checkedAt ? r.checkedAt.toISOString().slice(0, 10) : null,
    }));
  } catch (err) {
    console.error("Failed to load portal bonuses:", (err as Error).message);
  }

  return (
    <div>
      <PageHeader
        title="Shopping portal bonuses"
        subtitle="Bonus miles/points per $1 when you click through a portal before buying — stacked on top of your card earnings."
      />
      {rows.length === 0 ? (
        <SeedEmptyState feature="portal bonuses" />
      ) : (
        <PortalsClient rows={rows} />
      )}
    </div>
  );
}
