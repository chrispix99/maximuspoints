import type { NextRequest } from "next/server";

// Lazily import lib/auth so `next build` never evaluates the DB adapter
// (which requires DATABASE_URL) while collecting routes.
async function getHandlers() {
  const { handlers } = await import("@/lib/auth");
  return handlers;
}

export async function GET(req: NextRequest) {
  const handlers = await getHandlers();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const handlers = await getHandlers();
  return handlers.POST(req);
}
