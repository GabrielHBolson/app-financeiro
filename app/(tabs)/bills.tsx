import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, TextField, colors } from "@/components/ui";
import { deleteMonthlyBill, getMonthlyBills, insertMonthlyBill, toggleMonthlyBillActive } from "@/services/api";
import type { MonthlyBill } from "@/services/types";
import { formatCurrency, parseAmount } from "@/utils/format";

export default function BillsScreen() {
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setBills(await getMonthlyBills());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    const value = parseAmount(amount);
    const day = Number.parseInt(dueDay, 10);
    if (!name.trim() || value <= 0 || !day || day < 1 || day > 31) {
      Alert.alert("Dados inválidos", "Informe nome, valor e dia de vencimento (1 a 31).");
      return;
    }
    setSaving(true);
    const error = await insertMonthlyBill({ name: name.trim(), amount: value, due_day: day });
    setSaving(false);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    setName("");
    setAmount("");
    setDueDay("");
    setShowForm(false);
    load();
  };

  const handleToggle = async (bill: MonthlyBill) => {
    const error = await toggleMonthlyBillActive(bill.id, !bill.active);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    load();
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
          load();
        },
      },
    ]);
  };

  const activeTotal = bills.filter((b) => b.active).reduce((sum, b) => sum + b.amount, 0);

  return (
    <Screen>
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
          <Button title="Salvar conta" onPress={handleAdd} loading={saving} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Suas contas</Text>

      {bills.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.billRow, !item.active && styles.billRowInactive]}>
              <View style={styles.billInfo}>
                <Text style={[styles.billName, !item.active && styles.billTextInactive]}>{item.name}</Text>
                <Text style={styles.billDue}>Dia {item.due_day} · {formatCurrency(item.amount)}</Text>
              </View>
              <Switch value={item.active} onValueChange={() => handleToggle(item)} trackColor={{ true: colors.primary }} />
              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
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
});
