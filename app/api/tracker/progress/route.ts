import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { perkProgress } from "@/drizzle/schema";
import { currentPeriodKey } from "@/lib/periods";
import type { PerkCadence } from "@/drizzle/schema";

/** Set the used amount (cents) of a perk for the current period. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { perkId?: unknown; usedAmountCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { perkId, usedAmountCents } = body;
  if (typeof perkId !== "string" || typeof usedAmountCents !== "number") {
    return NextResponse.json(
      { error: "perkId (string) and usedAmountCents (number) are required." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(usedAmountCents) || usedAmountCents < 0) {
    return NextResponse.json(
      { error: "usedAmountCents must be a non-negative integer." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    // Fetch the perk to derive the correct current period key.
    const perkRows = await db.query.perks.findMany({
      where: (p, { eq: e }) => e(p.id, perkId),
      limit: 1,
    });
    const perk = perkRows[0];
    if (!perk) {
      return NextResponse.json({ error: "Perk not found." }, { status: 404 });
    }
    const periodKey = currentPeriodKey(perk.cadence as PerkCadence);

    await db
      .insert(perkProgress)
      .values({
        userId: session.user.id,
        perkId,
        periodKey,
        usedAmountCents,
      })
      .onConflictDoUpdate({
        target: [
          perkProgress.userId,
          perkProgress.perkId,
          perkProgress.periodKey,
        ],
        set: { usedAmountCents, updatedAt: new Date() },
      });

    return NextResponse.json({ ok: true, periodKey });
  } catch (err) {
    console.error("POST /api/tracker/progress failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not save progress." },
      { status: 500 },
    );
  }
}
