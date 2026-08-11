import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, Screen } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { useAuth } from "@/hooks/use-auth";
import { getBillPaymentsBetween, getMonthlyBills, getProfile, getTransactions } from "@/services/api";
import type { BillPayment, MonthlyBill, Profile, Transaction } from "@/services/types";
import { currentMonthLabel, formatCurrency, formatDate, monthEndISO, monthStartISO } from "@/utils/format";
import { summarizeBillsForMonth } from "@/utils/bills";

export default function DashboardScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    const [p, tx, bl, pl] = await Promise.all([
      getProfile(user.id),
      getTransactions(monthStartISO(month), monthEndISO(month)),
      getMonthlyBills(),
      getBillPaymentsBetween(monthStartISO(month), monthEndISO(month)),
    ]);
    setProfile(p);
    setTransactions(tx);
    setBills(bl);
    setPayments(pl);
  }, [user, month]);

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
  const invested = transactions.filter((t) => t.type === "investment").reduce((sum, t) => sum + t.amount, 0);
  const billsSummary = summarizeBillsForMonth(bills, payments, month);
  const billsPaid = billsSummary.paidTotal;
  const balance = income - expense - billsPaid - invested;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Olá, {profile?.full_name?.split(" ")[0] || "você"}!</Text>
          <Text style={styles.greetingSub}>{currentMonthLabel(month)}</Text>
        </View>

        <MonthPicker value={month} onChange={setMonth} />

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo do mês</Text>
          <Text style={[styles.balanceValue, balance < 0 && { color: "#FFB4B4" }]}>{formatCurrency(balance)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up-circle" size={20} color={colors.income} />
            <Text style={styles.statValue}>{formatCurrency(income)}</Text>
            <Text style={styles.statLabel}>Recebido</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down-circle" size={20} color={colors.expense} />
            <Text style={styles.statValue}>{formatCurrency(expense)}</Text>
            <Text style={styles.statLabel}>Gasto</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(billsPaid)}</Text>
            <Text style={styles.statLabel}>Contas pagas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(invested)}</Text>
            <Text style={styles.statLabel}>Investido</Text>
          </View>
        </View>

        <View style={styles.billsCard}>
          <View style={styles.billsRow}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.billsTitle}>Contas do mês</Text>
          </View>
          <Text style={styles.billsValue}>
            {billsSummary.paidCount} de {billsSummary.expectedCount} pagas · {formatCurrency(billsSummary.paidTotal)} pagos de {formatCurrency(billsSummary.expectedTotal)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Lançamentos do mês</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum lançamento neste mês.</Text>
          </View>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.transactionRow}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{t.description || "Sem descrição"}</Text>
                <Text style={styles.transactionDate}>{formatDate(t.date)}</Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  t.type === "income" ? styles.incomeAmount : t.type === "expense" ? styles.expenseAmount : styles.investedAmount,
                ]}
              >
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
    marginBottom: 12,
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  billsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
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
  investedAmount: {
    color: colors.primary,
  },
});
