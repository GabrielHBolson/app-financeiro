import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, TextField, colors } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { BillPaymentRow } from "@/components/bill-payment-row";
import {
  deleteMonthlyBill,
  getBillPaymentsBetween,
  getMonthlyBills,
  insertMonthlyBill,
  markBillPaid,
  toggleMonthlyBillActive,
  undoBillPayment,
} from "@/services/api";
import type { BillPayment, MonthlyBill } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { ensureNotificationPermission, syncBillReminders } from "@/services/notifications";
import { formatCurrency, monthEndISO, monthStartISO, parseAmount } from "@/utils/format";
import { getBillOccurrence, summarizeBillsForMonth } from "@/utils/bills";

export default function BillsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date());
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [totalMonths, setTotalMonths] = useState("12");
  const [startMonth, setStartMonth] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [bl, pl] = await Promise.all([
      getMonthlyBills(),
      getBillPaymentsBetween(monthStartISO(month), monthEndISO(month)),
    ]);
    setBills(bl);
    setPayments(pl);
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    const [bl, pl] = await Promise.all([
      getMonthlyBills(),
      getBillPaymentsBetween(monthStartISO(month), monthEndISO(month)),
    ]);
    setBills(bl);
    setPayments(pl);
    syncBillReminders(bl, pl);
  };

  const monthBills = bills
    .filter((b) => b.active && getBillOccurrence(b, month))
    .sort((a, b) => a.due_day - b.due_day);

  const paidMap = new Map(payments.map((p) => [p.bill_id, p]));
  const summary = summarizeBillsForMonth(bills, payments, month);

  const handleAdd = async () => {
    const value = parseAmount(amount);
    const day = Number.parseInt(dueDay, 10);
    const months = Number.parseInt(totalMonths, 10);
    if (!user || !name.trim() || value <= 0 || !day || day < 1 || day > 31) {
      Alert.alert("Dados inválidos", "Informe nome, valor e dia de vencimento (1 a 31).");
      return;
    }
    if (!isRecurring && (!months || months < 1)) {
      Alert.alert("Dados inválidos", "Informe a quantidade de meses (mínimo 1).");
      return;
    }
    setSaving(true);
    const error = await insertMonthlyBill(user.id, {
      name: name.trim(),
      amount: value,
      due_day: day,
      is_recurring: isRecurring,
      total_months: isRecurring ? null : months,
      start_month: isRecurring ? null : monthStartISO(startMonth),
    });
    setSaving(false);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    setName("");
    setAmount("");
    setDueDay("");
    setTotalMonths("12");
    setStartMonth(new Date());
    setShowForm(false);
    await ensureNotificationPermission();
    await refresh();
  };

  const handleToggle = async (bill: MonthlyBill) => {
    const error = await toggleMonthlyBillActive(bill.id, !bill.active);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    await refresh();
  };

  const handleMarkPaid = async (bill: MonthlyBill) => {
    if (!user) {
      return;
    }
    const monthKey = monthStartISO(month);
    const alreadyPaid = paidMap.has(bill.id);
    const error = alreadyPaid ? await undoBillPayment(bill.id, monthKey) : await markBillPaid(user.id, { bill_id: bill.id, month: monthKey, amount: bill.amount });
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    await refresh();
  };

  const handleDelete = (bill: MonthlyBill) => {
    Alert.alert("Excluir conta", `Excluir "${bill.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const error = await deleteMonthlyBill(bill.id);
          if (error) {
            Alert.alert("Erro", error);
            return;
          }
          await refresh();
        },
      },
    ]);
  };

  const renderBill = ({ item }: { item: MonthlyBill }) => (
    <BillPaymentRow
      bill={item}
      payment={paidMap.get(item.id)}
      month={month}
      onToggle={() => handleMarkPaid(item)}
      onPressInfo={() => router.push(`/bill/${item.id}`)}
      right={
        <>
          <Switch value={item.active} onValueChange={() => handleToggle(item)} trackColor={{ true: colors.primary }} />
          <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </>
      }
    />
  );

  return (
    <Screen>
      <FlatList
        data={monthBills}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={renderBill}
        ListHeaderComponent={
          <View>
            <MonthPicker value={month} onChange={setMonth} />

            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Contas do mês</Text>
              <Text style={styles.summaryValue}>
                {summary.paidCount} de {summary.expectedCount} pagas
              </Text>
              <View style={styles.totalsRow}>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Pago</Text>
                  <Text style={styles.totalPaid}>{formatCurrency(summary.paidTotal)}</Text>
                </View>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Pendente</Text>
                  <Text style={styles.totalPending}>{formatCurrency(summary.pendingTotal)}</Text>
                </View>
              </View>
            </View>

            <Button title={showForm ? "Fechar formulário" : "+ Nova conta mensal"} onPress={() => setShowForm((s) => !s)} variant={showForm ? "ghost" : "primary"} />

            {showForm ? (
              <View style={styles.card}>
                <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Aluguel, Internet..." autoCapitalize="sentences" />
                <TextField label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
                <TextField label="Dia de vencimento" value={dueDay} onChangeText={setDueDay} placeholder="Ex.: 10" keyboardType="number-pad" />

                <View style={styles.switchRow}>
                  <View style={styles.switchText}>
                    <Text style={styles.switchTitle}>Mensalidade</Text>
                    <Text style={styles.switchHint}>Paga todo mês, sem data de término.</Text>
                  </View>
                  <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: colors.primary }} />
                </View>

                {!isRecurring ? (
                  <>
                    <TextField label="Quantidade de meses" value={totalMonths} onChangeText={setTotalMonths} placeholder="Ex.: 12" keyboardType="number-pad" />
                    <Text style={styles.switchTitle}>Mês de início</Text>
                    <MonthPicker value={startMonth} onChange={setStartMonth} />
                  </>
                ) : null}

                <Button title="Salvar conta" onPress={handleAdd} loading={saving} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Contas de {new Date(month.getFullYear(), month.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma conta neste mês.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 140 }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  totalsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  totalBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  totalPaid: {
    color: "#BBF7D0",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  totalPending: {
    color: "#FFB4B4",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  switchText: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  switchHint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textTransform: "capitalize",
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
});
