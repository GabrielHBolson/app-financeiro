import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, TextField, colors } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import {
  deleteMonthlyBill,
  getAllBillPayments,
  getMonthlyBills,
  insertMonthlyBill,
  markBillPaid,
  toggleMonthlyBillActive,
  undoBillPayment,
} from "@/services/api";
import type { BillPayment, MonthlyBill } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { ensureNotificationPermission, syncBillReminders } from "@/services/notifications";
import { formatCurrency, monthStartISO, parseAmount } from "@/utils/format";

export default function BillsScreen() {
  const { user } = useAuth();
  const router = useRouter();
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
    const [bl, pl] = await Promise.all([getMonthlyBills(), getAllBillPayments()]);
    setBills(bl);
    setPayments(pl);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    const [bl, pl] = await Promise.all([getMonthlyBills(), getAllBillPayments()]);
    setBills(bl);
    setPayments(pl);
    syncBillReminders(bl, pl);
  };

  const paymentsFor = (billId: string) => payments.filter((p) => p.bill_id === billId);

  const isCurrentMonthPaid = (bill: MonthlyBill) => paymentsFor(bill.id).some((p) => p.month === monthStartISO());

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
    const month = monthStartISO();
    const alreadyPaid = isCurrentMonthPaid(bill);
    const error = alreadyPaid ? await undoBillPayment(bill.id, month) : await markBillPaid(user.id, { bill_id: bill.id, month, amount: bill.amount });
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

  const activeTotal = bills.filter((b) => b.active).reduce((sum, b) => sum + b.amount, 0);

  const paidLabel = (bill: MonthlyBill) => {
    const count = paymentsFor(bill.id).length;
    if (!bill.is_recurring && bill.total_months != null) {
      return count >= bill.total_months ? `Concluída · ${count}/${bill.total_months}` : `${count}/${bill.total_months} pagas`;
    }
    return `${count} ${count === 1 ? "paga" : "pagas"}`;
  };

  const renderBill = ({ item }: { item: MonthlyBill }) => {
    const alreadyPaid = isCurrentMonthPaid(item);
    const completed = !item.is_recurring && item.total_months != null && paymentsFor(item.id).length >= item.total_months;
    return (
      <Pressable
        style={[styles.billRow, (!item.active || completed) && styles.billRowInactive]}
        onPress={() => router.push(`/bill/${item.id}`)}
      >
        <View style={styles.billInfo}>
          <Text style={[styles.billName, !item.active && styles.billTextInactive]}>{item.name}</Text>
          <Text style={styles.billDue}>
            Dia {item.due_day} · {formatCurrency(item.amount)} · {paidLabel(item)}
          </Text>
          {!item.is_recurring && item.total_months != null ? (
            <Text style={styles.billTerm}>{item.total_months} {item.total_months === 1 ? "mês" : "meses"}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => handleMarkPaid(item)} hitSlop={8} disabled={!item.active}>
          <Ionicons
            name={alreadyPaid ? "checkmark-circle" : "checkmark-circle-outline"}
            size={24}
            color={alreadyPaid ? colors.success : colors.muted}
          />
        </Pressable>
        <Switch value={item.active} onValueChange={() => handleToggle(item)} trackColor={{ true: colors.primary }} />
        <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <Screen>
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={renderBill}
        ListHeaderComponent={
          <View>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Total de contas ativas</Text>
              <Text style={styles.summaryValue}>{formatCurrency(activeTotal)}</Text>
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

            <Text style={styles.sectionTitle}>Suas contas</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
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
  billRow: {
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
  billRowInactive: {
    opacity: 0.5,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  billTextInactive: {
    textDecorationLine: "line-through",
  },
  billDue: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  billTerm: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
});
