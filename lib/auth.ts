import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import * as schema from "@/drizzle/schema";

// The adapter is built lazily: `next build` imports this module while
// collecting page data, where DATABASE_URL may not be set. At request time
// (dev server, `next start`, Vercel) the env var is always present, so the
// real adapter is used. Pages/APIs that need the DB call getDb() per request.
const db = process.env.DATABASE_URL ? getDb() : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(db
    ? {
        adapter: DrizzleAdapter(db, {
          usersTable: schema.users,
          accountsTable: schema.accounts,
          sessionsTable: schema.sessions,
          verificationTokensTable: schema.verificationTokens,
        }),
      }
    : {}),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Magic-link email sign-in via Resend. Set RESEND_API_KEY + EMAIL_FROM.
    Resend({
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
  },
});
