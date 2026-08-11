import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import type { BillPayment, MonthlyBill } from "@/services/types";
import { formatCurrency, formatPaidAt } from "@/utils/format";
import { getBillOccurrence } from "@/utils/bills";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    meta: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    installment: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
      marginTop: 2,
    },
    paidText: {
      fontSize: 13,
      color: colors.success,
      fontWeight: "600",
      marginTop: 2,
    },
    pendingText: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    paidAmount: {
      fontSize: 12,
      color: colors.success,
      marginTop: 2,
    },
  });
}

export function BillPaymentRow({
  bill,
  payment,
  month,
  onToggle,
  onPressInfo,
  disabled,
  right,
}: {
  bill: MonthlyBill;
  payment: BillPayment | undefined;
  month: Date;
  onToggle: () => void;
  onPressInfo?: () => void;
  disabled?: boolean;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const occurrence = getBillOccurrence(bill, month);

  return (
    <View style={styles.row}>
      <Pressable style={styles.info} onPress={onPressInfo}>
        <Text style={styles.name}>{bill.name}</Text>
        <Text style={styles.meta}>
          Dia {bill.due_day} · {formatCurrency(bill.amount)}
          {bill.has_variable_amount ? " (média)" : null}
        </Text>
        {occurrence?.installment != null ? (
          <Text style={styles.installment}>
            Parcela {occurrence.installment}/{occurrence.totalMonths}
          </Text>
        ) : null}
        <Text style={payment ? styles.paidText : styles.pendingText}>
          {payment ? `Pago em ${formatPaidAt(payment.paid_at)}` : "Pendente"}
        </Text>
        {bill.has_variable_amount && payment ? (
          <Text style={styles.paidAmount}>Pago: {formatCurrency(payment.amount)} de {formatCurrency(bill.amount)} média</Text>
        ) : null}
      </Pressable>
      <Pressable onPress={onToggle} hitSlop={8} disabled={disabled}>
        <Ionicons
          name={payment ? "checkmark-circle" : "checkmark-circle-outline"}
          size={24}
          color={payment ? colors.success : colors.muted}
        />
      </Pressable>
      {right}
    </View>
  );
}
