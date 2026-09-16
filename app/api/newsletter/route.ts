import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { newsletterSubscribers } from "@/drizzle/schema";

const MISSING_KEYS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

function missingEnv(): string[] {
  return MISSING_KEYS.filter((k) => !process.env[k]);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * POST /api/newsletter { email, source? }
 *
 * Degrades gracefully:
 * - RESEND keys missing  -> { ok:false, pending:true, missing:[...] }
 *   (the client shows "alerts aren't live yet")
 * - DB table missing (migration not yet run in prod) -> still sends the
 *   welcome email; subscriber persistence is best-effort and never crashes.
 */
export async function POST(req: Request) {
  let body: { email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const source =
    typeof body.source === "string" ? body.source.slice(0, 40) : null;

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const missing = missingEnv();
  if (missing.length > 0) {
    // Email is not wired up yet — tell the client exactly what's missing
    // so it can render an honest "coming soon" state.
    return NextResponse.json({ ok: false, pending: true, missing });
  }

  // Best-effort persistence (works once drizzle/0003_newsletter.sql is
  // applied in prod; never fatal if it isn't).
  try {
    const db = getDb();
    await db
      .insert(newsletterSubscribers)
      .values({ email, source })
      .onConflictDoNothing({ target: newsletterSubscribers.email });
  } catch (err) {
    console.error(
      "newsletter: subscriber persistence failed (non-fatal):",
      (err as Error).message,
    );
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: "You're on the maximusPoints alert list ✈️",
      html: `<p>You're signed up for maximusPoints perk-expiry alerts.</p>
<p>Once a month we'll flag the airline, hotel, and dining credits on your cards that are about to expire unused — so you never leave money on the table.</p>
<p style="color:#64748b;font-size:12px">maximusPoints · earn math valued at 1¢/point · not financial advice</p>`,
    });
  } catch (err) {
    console.error("newsletter: welcome email failed:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Couldn't send the confirmation email. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** Lets the client render the right state without attempting a signup. */
export async function GET() {
  const missing = missingEnv();
  return NextResponse.json(
    missing.length > 0
      ? { configured: false, missing }
      : { configured: true },
  );
}
