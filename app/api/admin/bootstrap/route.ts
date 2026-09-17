/**
 * TEMPORARY one-off seed route: portals only. JSON is statically imported so
 * the data is bundled into the function. Guarded by BOOTSTRAP_KEY.
 * DELETE after use.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizePortalList, seedPortals } from "@/lib/portal-seed";
import portalsJson from "@/data/portals.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.BOOTSTRAP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const db = getDb();
    const portals = normalizePortalList(portalsJson);
    const portalResult = await seedPortals(db, portals);
    return NextResponse.json({ ok: true, portals: portalResult });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
