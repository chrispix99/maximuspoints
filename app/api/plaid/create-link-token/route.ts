import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPlaidClient,
  PLAID_PRODUCTS,
  PLAID_COUNTRY_CODES,
} from "@/lib/plaid";

/** Create a Plaid Link token for the logged-in user. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "maximusPoints",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    // Never include token material in error responses.
    console.error("Plaid linkTokenCreate failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not create a Plaid Link token." },
      { status: 500 },
    );
  }
}
