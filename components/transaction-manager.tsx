import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui";
import { AmountInputModal } from "@/components/amount-input-modal";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { deleteTransaction, getBillPaymentsBetween, getMonthlyBills, getTransactions, markBillPaid, undoBillPayment } from "@/services/api";
import type { BillPayment, CategoryType, MonthlyBill, Transaction } from "@/services/types";
import { formatCurrency, formatDate, monthEndISO, monthStartISO } from "@/utils/format";
import { MonthPicker } from "@/components/month-picker";
import { TransactionForm } from "@/components/transaction-form";
import { BillPaymentRow } from "@/components/bill-payment-row";
import { syncBillReminders } from "@/services/notifications";
import { useAuth } from "@/hooks/use-auth";
import { summarizeBillsForMonth, getBillOccurrence } from "@/utils/bills";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: 24,
    },
    summary: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    summaryLabel: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    summaryValue: {
      color: "#FFFFFF",
      fontSize: 26,
      fontWeight: "800",
      marginTop: 4,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: "center",
    },
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
    desc: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    date: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    amount: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    billsSummary: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "600",
      marginBottom: 12,
    },
  });
}

export function TransactionManager({ type, title, showBills }: { type: CategoryType; title: string; showBills?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [payingBill, setPayingBill] = useState<MonthlyBill | null>(null);

  const load = useCallback(async () => {
    const tx = getTransactions(monthStartISO(month), monthEndISO(month), type);
    if (!showBills) {
      setTransactions(await tx);
      return;
    }
    const [txList, bl, pl] = await Promise.all([tx, getMonthlyBills(), getBillPaymentsBetween(monthStartISO(month), monthEndISO(month))]);
    setTransactions(txList);
    setBills(bl);
    setPayments(pl);
  }, [month, type, showBills]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const billsSummary = summarizeBillsForMonth(bills, payments, month);
  const paidMap = new Map(payments.map((p) => [p.bill_id, p]));
  const monthBills = bills.filter((b) => b.active && getBillOccurrence(b, month)).sort((a, b) => a.due_day - b.due_day);

  const handleBillToggle = async (bill: MonthlyBill) => {
    if (!user) {
      return;
    }
    const monthKey = monthStartISO(month);
    const alreadyPaid = paidMap.has(bill.id);
    if (alreadyPaid) {
      const error = await undoBillPayment(bill.id, monthKey);
      if (error) {
        Alert.alert("Erro", error);
        return;
      }
      const [bl, pl] = await Promise.all([getMonthlyBills(), getBillPaymentsBetween(monthStartISO(month), monthEndISO(month))]);
      setBills(bl);
      setPayments(pl);
      syncBillReminders(bl, pl);
      return;
    }
    if (bill.has_variable_amount) {
      setPayingBill(bill);
      return;
    }
    const error = await markBillPaid(user.id, { bill_id: bill.id, month: monthKey, amount: bill.amount });
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    const [bl, pl] = await Promise.all([getMonthlyBills(), getBillPaymentsBetween(monthStartISO(month), monthEndISO(month))]);
    setBills(bl);
    setPayments(pl);
    syncBillReminders(bl, pl);
  };

  const confirmAmountPaid = async (amount: number) => {
    if (!user || !payingBill) {
      return;
    }
    setPayingBill(null);
    const monthKey = monthStartISO(month);
    const error = await markBillPaid(user.id, { bill_id: payingBill.id, month: monthKey, amount });
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    const [bl, pl] = await Promise.all([getMonthlyBills(), getBillPaymentsBetween(monthStartISO(month), monthEndISO(month))]);
    setBills(bl);
    setPayments(pl);
    syncBillReminders(bl, pl);
  };

  const startNew = () => {
    setEditing(null);
    setShowForm((s) => !s);
  };

  const startEdit = (t: Transaction) => {
    setEditing(t);
    setShowForm(true);
  };

  const handleDelete = (t: Transaction) => {
    Alert.alert("Excluir lançamento", `Excluir "${t.description || title}" de ${formatCurrency(t.amount)}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const error = await deleteTransaction(t.id);
          if (error) {
            Alert.alert("Erro", error);
            return;
          }
          load();
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <MonthPicker value={month} onChange={setMonth} />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total de {title}s no mês</Text>
        <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
      </View>

      <Button title={showForm ? "Fechar formulário" : `+ Novo ${title}`} onPress={startNew} variant={showForm ? "ghost" : "primary"} />

      {showForm ? (
        <View style={styles.formCard}>
          <TransactionForm
            key={editing?.id ?? "new"}
            type={type}
            title={title}
            editing={editing}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              load();
            }}
          />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Lançamentos do mês</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum {title} neste mês.</Text>
        </View>
      ) : (
        transactions.map((t) => (
          <View key={t.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.desc}>{t.description || "Sem descrição"}</Text>
              <Text style={styles.date}>{formatDate(t.date)}</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(t.amount)}</Text>
            <Pressable onPress={() => startEdit(t)} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => handleDelete(t)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}

      {showBills ? (
        <>
          <Text style={styles.sectionTitle}>Contas do mês</Text>
          <Text style={styles.billsSummary}>
            {billsSummary.paidCount} de {billsSummary.expectedCount} pagas · {formatCurrency(billsSummary.paidTotal)} pagos
          </Text>
          {monthBills.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhuma conta neste mês.</Text>
            </View>
          ) : (
            monthBills.map((bill) => <BillPaymentRow key={bill.id} bill={bill} payment={paidMap.get(bill.id)} month={month} onToggle={() => handleBillToggle(bill)} />)
          )}
        </>
      ) : null}
    </ScrollView>
    <AmountInputModal
      visible={payingBill !== null}
      defaultValue={payingBill?.amount ?? 0}
      onClose={() => setPayingBill(null)}
      onConfirm={confirmAmountPaid}
    />
    </>
  );
}
