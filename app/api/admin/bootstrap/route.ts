/**
 * TEMPORARY one-off seed route. Deletes after use.
 * Guarded by BOOTSTRAP_KEY env var; reads card data baked into the bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "@/lib/db";
import { normalizeCardList, seedCards } from "@/lib/card-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FILES = [
  "cards_premium.json",
  "cards_midtier.json",
  "cards_gapfill.json",
  "cards_nofee.json",
  "cards_cobrands.json",
  "cards_business.json",
  "cards_store.json",
];

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.BOOTSTRAP_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    // Data dir sits one level above .next in the deployed bundle.
    const here = dirname(fileURLToPath(import.meta.url));
    const dataDir = resolve(here, "..", "..", "..", "..", "data");
    const files = FILES.map((f) => {
      const file = resolve(dataDir, f);
      return { label: f, parsed: JSON.parse(readFileSync(file, "utf8")) };
    });
    const cards = normalizeCardList(files);
    const result = await seedCards(getDb(), cards);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
