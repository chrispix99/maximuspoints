import { signIn } from "@/lib/auth";
import { Panel, PageHeader } from "@/components/ui";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Sign in"
        subtitle="Sign in to track perks and connect your accounts via Plaid."
      />
      <Panel>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/tracker" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Continue with Google
          </button>
        </form>
        <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or with email
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: formData.get("email"),
              redirectTo: "/tracker",
            });
          }}
        >
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Send magic link
          </button>
        </form>
      </Panel>
    </div>
  );
}
