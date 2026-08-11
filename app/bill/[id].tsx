import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui";
import { AmountInputModal } from "@/components/amount-input-modal";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
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
import { addMonths, currentMonthLabel, formatCurrency, formatPaidAt, monthStartISO } from "@/utils/format";
import { buildMonthWindow } from "@/utils/bills";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    monthTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      textTransform: "capitalize",
    },
    monthSub: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
      textTransform: "capitalize",
    },
    monthStatusPaid: {
      fontSize: 13,
      color: colors.success,
      fontWeight: "600",
      marginTop: 2,
    },
    monthStatusPending: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
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
}

function PaymentRow({
  title,
  subtitle,
  monthKey,
  amount,
  paid,
  onToggle,
  onSaveDescription,
  colors,
  styles,
}: {
  title: string;
  subtitle?: string;
  monthKey: string;
  amount: number;
  paid: BillPayment | undefined;
  onToggle: (monthKey: string) => void;
  onSaveDescription: (monthKey: string, text: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.monthRow}>
      <Pressable style={styles.monthMain} onPress={() => onToggle(monthKey)}>
        <View style={styles.monthInfo}>
          <Text style={styles.monthTitle}>{title}</Text>
          {subtitle ? <Text style={styles.monthSub}>{subtitle}</Text> : null}
          <Text style={paid ? styles.monthStatusPaid : styles.monthStatusPending}>
            {paid ? `Pago em ${formatPaidAt(paid.paid_at)}` : "Não pago"}
          </Text>
        </View>
        <View style={styles.monthRight}>
          <Text style={[styles.monthAmount, paid && styles.monthAmountPaid]}>{formatCurrency(amount)}</Text>
          <Ionicons name={paid ? "checkmark-circle" : "checkmark-circle-outline"} size={26} color={paid ? colors.success : colors.muted} />
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingMonth, setPayingMonth] = useState<string | null>(null);

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
    if (existing) {
      const error = await undoBillPayment(bill.id, monthKey);
      if (error) {
        Alert.alert("Erro", error);
        return;
      }
      await reload();
      return;
    }
    if (bill.has_variable_amount) {
      setPayingMonth(monthKey);
      return;
    }
    const error = await markBillPaid(user.id, { bill_id: bill.id, month: monthKey, amount: bill.amount });
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    await reload();
  };

  const confirmAmountPaid = async (amount: number) => {
    if (!user || !bill || !payingMonth) {
      return;
    }
    setPayingMonth(null);
    const error = await markBillPaid(user.id, { bill_id: bill.id, month: payingMonth, amount });
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

  const renderInstallment = ({ item }: { item: { date: Date; key: string; index: number } }) => {
    const paid = paidMap.get(item.key);
    return (
      <PaymentRow
        title={`Parcela ${item.index + 1}/${bill?.total_months ?? item.index + 1}`}
        subtitle={currentMonthLabel(item.date)}
        monthKey={item.key}
        amount={paid ? paid.amount : (bill?.amount ?? 0)}
        paid={paid}
        onToggle={handleToggle}
        onSaveDescription={handleSaveDescription}
        colors={colors}
        styles={styles}
      />
    );
  };

  const renderHistory = ({ item }: { item: Date }) => {
    const key = monthStartISO(item);
    const paid = paidMap.get(key);
    return (
      <PaymentRow
        title={currentMonthLabel(item)}
        monthKey={key}
        amount={paid ? paid.amount : (bill?.amount ?? 0)}
        paid={paid}
        onToggle={handleToggle}
        onSaveDescription={handleSaveDescription}
        colors={colors}
        styles={styles}
      />
    );
  };

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
  const history = bill.is_recurring ? buildMonthWindow(12) : [];

  return (
    <>
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
        <Text style={styles.summaryMeta}>{bill.has_variable_amount ? "Valor médio" : "Valor"}</Text>
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
          <Text style={styles.sectionTitle}>Histórico</Text>
          <FlatList
            data={history}
            keyExtractor={(item) => monthStartISO(item)}
            showsVerticalScrollIndicator={false}
            renderItem={renderHistory}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        </>
      )}
    </Screen>
    <AmountInputModal
      visible={payingMonth !== null}
      defaultValue={bill?.amount ?? 0}
      onClose={() => setPayingMonth(null)}
      onConfirm={confirmAmountPaid}
    />
    </>
  );
}
