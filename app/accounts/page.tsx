import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import AccountsClient from "@/components/AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/signin");

  return (
    <div>
      <PageHeader
        title="Connected accounts"
        subtitle="Balances synced from your bank via Plaid."
      />
      <AccountsClient />
    </div>
  );
}
