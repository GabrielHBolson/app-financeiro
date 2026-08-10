import { Screen } from "@/components/ui";
import { TransactionManager } from "@/components/transaction-manager";

export default function InvestmentsScreen() {
  return (
    <Screen>
      <TransactionManager type="investment" title="Investimento" />
    </Screen>
  );
}
