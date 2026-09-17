import { getActiveOffers } from "@/lib/offers";
import { PageHeader, SeedEmptyState } from "@/components/ui";
import OffersClient from "@/components/OffersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/offers" },
};

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = getActiveOffers();

  return (
    <div>
      <PageHeader
        title="Amex & Chase Offers"
        subtitle="Enroll-and-save deals from Amex Offers and Chase Offers — check your banking app to enroll, then they stack with portals and card earnings."
      />
      {offers.length === 0 ? (
        <SeedEmptyState feature="card offers" />
      ) : (
        <OffersClient offers={offers} />
      )}
    </div>
  );
}
