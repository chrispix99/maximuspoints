import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { plaidItems } from "@/drizzle/schema";
import { getPlaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/crypto";

export interface SyncedAccount {
  itemId: string;
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    isoCurrencyCode: string | null;
  };
}

/** List the logged-in user's synced Plaid accounts with balances.
 *  Access tokens are decrypted in memory only, used once, and never
 *  returned or logged. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const items = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.userId, session.user.id));

    if (items.length === 0) {
      return NextResponse.json({ accounts: [] satisfies SyncedAccount[] });
    }

    const plaid = getPlaidClient();
    const accounts: SyncedAccount[] = [];

    for (const item of items) {
      let accessToken: string;
      try {
        accessToken = decryptToken(item.accessTokenEncrypted);
      } catch (err) {
        console.error(
          `Skipping Plaid item ${item.plaidItemId}: decryption failed.`,
          (err as Error).message,
        );
        continue;
      }
      try {
        const res = await plaid.accountsGet({ access_token: accessToken });
        for (const a of res.data.accounts) {
          accounts.push({
            itemId: item.plaidItemId,
            accountId: a.account_id,
            name: a.name,
            officialName: a.official_name ?? null,
            type: a.type,
            subtype: a.subtype ?? null,
            mask: a.mask ?? null,
            balances: {
              available: a.balances.available ?? null,
              current: a.balances.current ?? null,
              limit: a.balances.limit ?? null,
              isoCurrencyCode: a.balances.iso_currency_code ?? null,
            },
          });
        }
      } catch (err) {
        console.error(
          `Plaid accountsGet failed for item ${item.plaidItemId}:`,
          (err as Error).message,
        );
      }
    }

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("GET /api/plaid/accounts failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not load synced accounts." },
      { status: 500 },
    );
  }
}
