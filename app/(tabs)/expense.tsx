import { Screen } from "@/components/ui";
import { TransactionManager } from "@/components/transaction-manager";

export default function ExpenseScreen() {
  return (
    <Screen>
      <TransactionManager type="expense" title="Gasto" showBills />
    </Screen>
  );
}
