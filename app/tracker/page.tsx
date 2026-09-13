import { redirect } from "next/navigation";
import { desc, eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cards, perkProgress, userCards } from "@/drizzle/schema";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import TrackerClient, {
  type TrackerPerk,
  type TrackerCard,
} from "@/components/TrackerClient";
import { currentPeriodKey } from "@/lib/periods";
import type { PerkCadence } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/signin");

  const db = getDb();

  const cardRows = await db.query.cards.findMany({
    orderBy: [desc(cards.annualFee)],
    with: { perks: true },
  });

  if (cardRows.length === 0) {
    return (
      <div>
        <PageHeader title="Perk tracker" />
        <SeedEmptyState feature="perk tracker" />
      </div>
    );
  }

  const selectedRows = await db
    .select({ cardId: userCards.cardId })
    .from(userCards)
    .where(eq(userCards.userId, session.user.id));
  const selectedCardIds = selectedRows.map((r) => r.cardId);

  // Load this user's progress for every perk's current period in one query.
  const perkIds = cardRows.flatMap((c) => c.perks.map((p) => p.id));
  const progressRows =
    perkIds.length > 0
      ? await db
          .select()
          .from(perkProgress)
          .where(
            and(
              eq(perkProgress.userId, session.user.id),
              inArray(perkProgress.perkId, perkIds),
            ),
          )
      : [];
  const progressByKey = new Map(
    progressRows.map((r) => [`${r.perkId}:${r.periodKey}`, r.usedAmountCents]),
  );

  const perks: TrackerPerk[] = cardRows.flatMap((card) =>
    card.perks.map((p) => {
      const cadence = p.cadence as PerkCadence;
      const periodKey = currentPeriodKey(cadence);
      return {
        id: p.id,
        cardId: card.id,
        cardName: card.name,
        name: p.name,
        amountCents: p.amountCents,
        cadence,
        details: p.details,
        usedAmountCents:
          progressByKey.get(`${p.id}:${periodKey}`) ?? 0,
      };
    }),
  );

  const cardList: TrackerCard[] = cardRows.map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer,
  }));

  return (
    <div>
      <PageHeader
        title="Perk tracker"
        subtitle="Check off your statement credits and perks as you use them."
      />
      <TrackerClient
        perks={perks}
        cards={cardList}
        selectedCardIds={selectedCardIds}
      />
    </div>
  );
}
