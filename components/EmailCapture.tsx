"use client";

import { useEffect, useState } from "react";
import { Panel } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "pending" }
  | { kind: "error"; message: string };

/**
 * Email capture for monthly perk-expiry alerts. Placed under
 * optimizer/advisor results. If the Resend keys aren't configured the
 * form degrades to an honest "not live yet" state instead of failing.
 */
export default function EmailCapture({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    // Check once whether the backend is actually wired up.
    fetch("/api/newsletter", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.configured === false) {
          setStatus({ kind: "pending" });
        }
      })
      .catch(() => {
        /* stay idle; the POST will surface any problem */
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ kind: "done" });
      } else if (data.pending) {
        setStatus({ kind: "pending" });
      } else {
        setStatus({
          kind: "error",
          message: data.error ?? "Something went wrong. Try again.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Try again.",
      });
    }
  }

  if (status.kind === "done") {
    return (
      <Panel className="border-green-200 bg-green-50">
        <p className="text-sm font-semibold text-green-800">
          ✅ You&apos;re on the list!
        </p>
        <p className="mt-1 text-sm text-green-700">
          We&apos;ll email you before your perk credits expire. One email a
          month, unsubscribe anytime.
        </p>
      </Panel>
    );
  }

  if (status.kind === "pending") {
    return (
      <Panel className="border-slate-200 bg-slate-50">
        <p className="text-sm font-semibold text-slate-700">
          🔔 Perk-expiry alerts — coming soon
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Monthly email alerts aren&apos;t wired up yet. The optimizer and
          advisor above work fully today — check back soon for alerts.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="border-brand-200 bg-brand-50">
      <h3 className="text-sm font-bold text-slate-900">
        🔔 Never lose a perk credit again
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Get one email a month flagging the airline, hotel, and dining credits
        about to expire unused.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          disabled={status.kind === "sending"}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {status.kind === "sending" ? "Signing up…" : "Alert me"}
        </button>
      </form>
      {status.kind === "error" && (
        <p className="mt-2 text-sm text-red-600">{status.message}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        One email a month. Unsubscribe anytime. We never sell your address.
      </p>
    </Panel>
  );
}
