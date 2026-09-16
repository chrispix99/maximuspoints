import { PageHeader } from "@/components/ui";
import CalculatorClient from "@/components/CalculatorClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/calculator" },
};

export default function CalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Balance transfer calculator"
        subtitle="See whether a 0% intro APR transfer actually saves you money."
      />
      <CalculatorClient />
    </div>
  );
}
