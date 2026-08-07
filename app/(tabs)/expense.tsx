import { Screen } from "@/components/ui";
import { TransactionForm } from "@/components/transaction-form";

export default function ExpenseScreen() {
  return (
    <Screen>
      <TransactionForm type="expense" title="gasto" />
    </Screen>
  );
}
