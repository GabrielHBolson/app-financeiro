import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, colors } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import {
  getAllBillPayments,
  getBillPayments,
  getMonthlyBill,
  getMonthlyBills,
  markBillPaid,
  undoBillPayment,
  updateBillPaymentDescription,
} from "@/services/api";
import type { BillPayment, MonthlyBill } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { syncBillReminders } from "@/services/notifications";
import { addMonths, currentMonthLabel, formatCurrency, monthStartISO } from "@/utils/format";

function PaymentRow({
  label,
  monthDate,
  monthKey,
  amount,
  paid,
  onToggle,
  onSaveDescription,
}: {
  label: string;
  monthDate: Date;
  monthKey: string;
  amount: number;
  paid: BillPayment | undefined;
  onToggle: (monthKey: string) => void;
  onSaveDescription: (monthKey: string, text: string) => void;
}) {
  return (
    <View style={styles.monthRow}>
      <Pressable style={styles.monthMain} onPress={() => onToggle(monthKey)}>
        <View style={styles.monthInfo}>
          <Text style={styles.monthLabel}>{label}</Text>
          <Text style={[styles.monthName, paid && styles.monthNamePaid]}>{currentMonthLabel(monthDate)}</Text>
        </View>
        <View style={styles.monthRight}>
          <Text style={[styles.monthAmount, paid && styles.monthAmountPaid]}>{formatCurrency(amount)}</Text>
          <Ionicons
            name={paid ? "checkmark-circle" : "checkmark-circle-outline"}
            size={26}
            color={paid ? colors.success : colors.muted}
          />
        </View>
      </Pressable>
      {paid ? (
        <TextInput
          style={styles.descInput}
          defaultValue={paid.description ?? ""}
          onEndEditing={(e) => onSaveDescription(monthKey, e.nativeEvent.text)}
          placeholder="Adicionar anotação (ex.: paguei com PIX)"
          placeholderTextColor={colors.muted}
          multiline
        />
      ) : null}
    </View>
  );
}

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  const reload = useCallback(async () => {
    if (!id) {
      return;
    }
    const [bl, pl, bp] = await Promise.all([getMonthlyBills(), getAllBillPayments(), getBillPayments(id)]);
    setBill(bl.find((b) => b.id === id) ?? null);
    setPayments(bp);
    syncBillReminders(bl, pl);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        return;
      }
      const billRow = await getMonthlyBill(id);
      const billPayments = await getBillPayments(id);
      if (!cancelled) {
        setBill(billRow);
        setPayments(billPayments);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const paidMap = new Map(payments.map((p) => [p.month, p]));

  const startDate = (() => {
    if (!bill) {
      return new Date();
    }
    if (bill.start_month) {
      return new Date(`${bill.start_month}T12:00:00`);
    }
    return new Date(bill.created_at);
  })();

  const installments = (() => {
    if (!bill || bill.is_recurring || bill.total_months == null) {
      return [];
    }
    return Array.from({ length: bill.total_months }, (_, i) => {
      const date = addMonths(startDate, i);
      return { date, key: monthStartISO(date), index: i };
    });
  })();

  const handleToggle = async (monthKey: string) => {
    if (!user || !bill) {
      return;
    }
    const existing = paidMap.get(monthKey);
    const error = existing
      ? await undoBillPayment(bill.id, monthKey)
      : await markBillPaid(user.id, { bill_id: bill.id, month: monthKey, amount: bill.amount });
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    await reload();
  };

  const handleSaveDescription = async (monthKey: string, text: string) => {
    if (!bill) {
      return;
    }
    const error = await updateBillPaymentDescription(bill.id, monthKey, text);
    if (error) {
      Alert.alert("Erro", error);
    }
  };

  const renderInstallment = ({ item }: { item: { date: Date; key: string; index: number } }) => (
    <PaymentRow
      label={`Parcela ${item.index + 1}`}
      monthDate={item.date}
      monthKey={item.key}
      amount={bill?.amount ?? 0}
      paid={paidMap.get(item.key)}
      onToggle={handleToggle}
      onSaveDescription={handleSaveDescription}
    />
  );

  if (loading) {
    return (
      <Screen style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Conta", headerBackButtonDisplayMode: "minimal" }} />
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (!bill) {
    return (
      <Screen style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Conta", headerBackButtonDisplayMode: "minimal" }} />
        <Text style={styles.emptyText}>Conta não encontrada.</Text>
      </Screen>
    );
  }

  const paidCount = payments.length;
  const isTerm = !bill.is_recurring && bill.total_months != null;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: bill.name,
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTitleStyle: { fontWeight: "700", color: colors.text },
          headerStyle: { backgroundColor: colors.surface },
        }}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryName}>{bill.name}</Text>
        <Text style={styles.summaryValue}>{formatCurrency(bill.amount)}</Text>
        <Text style={styles.summaryMeta}>Vence todo dia {bill.due_day}</Text>
        {isTerm ? (
          <Text style={styles.summaryMeta}>
            {bill.total_months} {bill.total_months === 1 ? "mês" : "meses"} · {paidCount}/{bill.total_months} pagas
          </Text>
        ) : (
          <Text style={styles.summaryMeta}>Mensalidade</Text>
        )}
        {!bill.active ? <Text style={styles.summaryMetaPaused}>Conta pausada</Text> : null}
      </View>

      {isTerm ? (
        <>
          <Text style={styles.sectionTitle}>Parcelas</Text>
          <FlatList
            data={installments}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            renderItem={renderInstallment}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        </>
      ) : (
        <>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          <PaymentRow
            label={currentMonthLabel(selectedMonth)}
            monthDate={selectedMonth}
            monthKey={monthStartISO(selectedMonth)}
            amount={bill.amount}
            paid={paidMap.get(monthStartISO(selectedMonth))}
            onToggle={handleToggle}
            onSaveDescription={handleSaveDescription}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryName: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryMeta: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 4,
  },
  summaryMetaPaused: {
    color: "#FBBF24",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  monthRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthInfo: {
    flex: 1,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  monthName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
    textTransform: "capitalize",
  },
  monthNamePaid: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  monthRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  monthAmountPaid: {
    color: colors.success,
  },
  descInput: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
});
