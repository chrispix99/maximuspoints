import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userCards } from "@/drizzle/schema";

/** Replace the logged-in user's selected cards. Body: { cardIds: string[] } */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cardIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { cardIds } = body;
  if (
    !Array.isArray(cardIds) ||
    !cardIds.every((c) => typeof c === "string")
  ) {
    return NextResponse.json(
      { error: "cardIds must be an array of strings." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const userId = session.user.id;
    await db.delete(userCards).where(eq(userCards.userId, userId));
    if (cardIds.length > 0) {
      await db.insert(userCards).values(
        cardIds.map((cardId) => ({ userId, cardId })),
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "POST /api/tracker/cards failed:",
      (err as Error).message,
    );
    return NextResponse.json(
      { error: "Could not save your cards." },
      { status: 500 },
    );
  }
}
