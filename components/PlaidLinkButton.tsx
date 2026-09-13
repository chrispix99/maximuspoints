"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";

type Status = "idle" | "loading" | "ready" | "linking" | "done" | "error";

/** Renders a "Connect your accounts" button backed by Plaid Link.
 *  Fetches a short-lived link token from our API, then opens Plaid Link.
 *  The public_token is exchanged server-side; tokens never touch logs. */
export default function PlaidLinkButton({
  onLinked,
}: {
  onLinked?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken) => {
      setStatus("linking");
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        if (!res.ok) throw new Error("exchange failed");
        setStatus("done");
        onLinked?.();
      } catch {
        setStatus("error");
        setError("Linking failed. Please try again.");
      }
    },
    [onLinked],
  );

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit: () => {
      if (status === "loading" || status === "ready") setStatus("idle");
    },
  });

  // Fetch the link token when the user clicks.
  const start = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      if (!res.ok) throw new Error("link token failed");
      const data = await res.json();
      setToken(data.link_token);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("Could not start Plaid Link. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (status === "ready" && ready) open();
  }, [status, ready, open]);

  if (status === "done") {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 ring-1 ring-green-200">
        ✅ Account connected! Balances are syncing.
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={status === "loading" || status === "linking"}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "loading" || status === "linking" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {status === "linking" ? "Finishing up…" : "Preparing secure link…"}
          </>
        ) : (
          <>🏦 Connect your accounts</>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Secure bank connection via Plaid. We store an encrypted token — never
        your login credentials.
      </p>
    </div>
  );
}
