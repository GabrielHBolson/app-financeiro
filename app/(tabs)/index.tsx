import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, Screen } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { getMonthlyBills, getProfile, getRecentTransactions, getTransactions } from "@/services/api";
import type { MonthlyBill, Profile, Transaction } from "@/services/types";
import { currentMonthLabel, formatCurrency, formatDate, monthStartISO, todayISO } from "@/utils/format";

export default function DashboardScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    const [p, tx, rx, bl] = await Promise.all([
      getProfile(user.id),
      getTransactions(monthStartISO(), todayISO()),
      getRecentTransactions(5),
      getMonthlyBills(),
    ]);
    setProfile(p);
    setTransactions(tx);
    setRecent(rx);
    setBills(bl);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const activeBills = bills.filter((b) => b.active);
  const billsTotal = activeBills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Olá, {profile?.full_name?.split(" ")[0] || "você"}!</Text>
          <Text style={styles.greetingSub}>{currentMonthLabel()}</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo do mês</Text>
          <Text style={[styles.balanceValue, balance < 0 && { color: colors.expense }]}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-up-circle" size={18} color={colors.income} />
              <Text style={styles.balanceItemValue}>{formatCurrency(income)}</Text>
              <Text style={styles.balanceItemLabel}>Recebido</Text>
            </View>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-down-circle" size={18} color={colors.expense} />
              <Text style={styles.balanceItemValue}>{formatCurrency(expense)}</Text>
              <Text style={styles.balanceItemLabel}>Gasto</Text>
            </View>
          </View>
        </View>

        <View style={styles.billsCard}>
          <View style={styles.billsRow}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.billsTitle}>Contas do mês</Text>
          </View>
          <Text style={styles.billsValue}>
            {activeBills.length} {activeBills.length === 1 ? "conta ativa" : "contas ativas"} · {formatCurrency(billsTotal)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Últimos lançamentos</Text>
        {recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum lançamento ainda. Adicione seu primeiro gasto ou recebido.</Text>
          </View>
        ) : (
          recent.map((t) => (
            <View key={t.id} style={styles.transactionRow}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{t.description || "Sem descrição"}</Text>
                <Text style={styles.transactionDate}>{formatDate(t.date)}</Text>
              </View>
              <Text style={[styles.transactionAmount, t.type === "income" ? styles.incomeAmount : styles.expenseAmount]}>
                {t.type === "income" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  greeting: {
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  greetingSub: {
    fontSize: 14,
    color: colors.muted,
    textTransform: "capitalize",
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  balanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  balanceItemValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  balanceItemLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    width: "100%",
    marginLeft: 24,
  },
  billsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  billsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  billsValue: {
    marginTop: 6,
    fontSize: 15,
    color: colors.muted,
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
    lineHeight: 20,
    textAlign: "center",
  },
  transactionRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  incomeAmount: {
    color: colors.income,
  },
  expenseAmount: {
    color: colors.expense,
  },
});
