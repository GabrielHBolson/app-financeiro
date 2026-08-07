import { Screen } from "@/components/ui";
import { TransactionForm } from "@/components/transaction-form";

export default function IncomeScreen() {
  return (
    <Screen>
      <TransactionForm type="income" title="recebido" />
    </Screen>
  );
}
