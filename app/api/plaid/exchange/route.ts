import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { plaidItems } from "@/drizzle/schema";
import { getPlaidClient } from "@/lib/plaid";
import { encryptToken } from "@/lib/crypto";

/** Exchange a Plaid public_token for an access token, encrypt it with
 *  AES-256-GCM, and store it. Tokens are never logged. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let publicToken: unknown;
  try {
    publicToken = (await req.json()).public_token;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof publicToken !== "string" || publicToken.length === 0) {
    return NextResponse.json(
      { error: "public_token is required." },
      { status: 400 },
    );
  }

  try {
    const plaid = getPlaidClient();
    // Do not log the request/response: they contain token material.
    const exchange = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token, item_id } = exchange.data;

    const db = getDb();
    await db
      .insert(plaidItems)
      .values({
        userId: session.user.id,
        plaidItemId: item_id,
        accessTokenEncrypted: encryptToken(access_token),
      })
      .onConflictDoUpdate({
        target: plaidItems.plaidItemId,
        set: {
          accessTokenEncrypted: encryptToken(access_token),
          updatedAt: new Date(),
        },
      });

    // Confirm without ever echoing the token back.
    return NextResponse.json({ ok: true, item_id });
  } catch (err) {
    console.error("Plaid token exchange failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not link the account. Please try again." },
      { status: 500 },
    );
  }
}
