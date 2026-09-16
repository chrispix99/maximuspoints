import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth, signOut } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "maximusPoints — Credit Card Rewards Optimizer",
  description:
    "Browse credit cards, optimize spend, track perk credits, and sync accounts via Plaid.",
};

const NAV = [
  { href: "/cards", label: "Cards" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/advisor", label: "Advisor" },
  { href: "/alaska", label: "Alaska ✈️" },
  { href: "/portals", label: "Portals" },
  { href: "/calculator", label: "Calculator" },
  { href: "/tracker", label: "Tracker" },
  { href: "/accounts", label: "Accounts" },
];

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        Sign out
      </button>
    </form>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keep the layout dynamic so the session is evaluated per request.
  const session = await auth().catch(() => null);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <GoogleAnalytics />
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              <span className="text-brand-600">maximus</span>Points
            </Link>
            <nav className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto sm:gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
              {session?.user ? (
                <SignOutButton />
              ) : (
                <Link
                  href="/signin"
                  className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6">
          <p className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-400">
            maximusPoints · earn math valued at 1¢/point · not financial advice
          </p>
          <p className="mx-auto mt-1 max-w-5xl px-4 text-center text-[11px] text-slate-400">
            We may earn a commission when you apply for a card through links on
            this site. Rankings are computed from public earn rates and fees —
            never from who pays us.
          </p>
        </footer>
      </body>
    </html>
  );
}
