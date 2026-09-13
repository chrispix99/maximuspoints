import { PageHeader } from "@/components/ui";
import CalculatorClient from "@/components/CalculatorClient";

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
