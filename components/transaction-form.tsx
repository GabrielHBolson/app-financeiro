import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Button, TextField } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { getCategories, insertTransaction, updateTransaction } from "@/services/api";
import type { Category, CategoryType, Transaction } from "@/services/types";
import { formatCurrency, formatDate, parseAmount, toISODate } from "@/utils/format";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dateText: {
      fontSize: 16,
      color: colors.text,
    },
    noCategories: {
      fontSize: 14,
      color: colors.muted,
      fontStyle: "italic",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
    },
    chipTextActive: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    summary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderTopWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.primary,
    },
  });
}

export function TransactionForm({
  type,
  title,
  editing,
  onSaved,
}: {
  type: CategoryType;
  title: string;
  editing?: Transaction | null;
  onSaved?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [amount, setAmount] = useState(() => (editing ? String(editing.amount).replace(".", ",") : ""));
  const [description, setDescription] = useState(() => editing?.description ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(() => editing?.category_id ?? null);
  const [date, setDate] = useState(() => {
    if (editing) {
      const [y, m, d] = editing.date.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return new Date();
  });
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getCategories(type).then(setCategories);
    }
  }, [user, type]);

  const handleSubmit = async () => {
    const value = parseAmount(amount);
    if (value <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      return;
    }
    if (!user) {
      return;
    }
    setSaving(true);
    const input = {
      amount: value,
      description,
      date: toISODate(date),
      category_id: categoryId,
    };
    const error = editing ? await updateTransaction(editing.id, input) : await insertTransaction(user.id, { ...input, type });
    setSaving(false);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    setAmount("");
    setDescription("");
    setCategoryId(null);
    onSaved?.();
    Alert.alert("Pronto!", editing ? `${title} atualizado com sucesso.` : `${title} registrado com sucesso.`);
  };

  const onDateChange = (event: { type: string }, selected?: Date) => {
    setShowDate(Platform.OS === "ios");
    if (selected) {
      setDate(selected);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <TextField label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />

        <View style={styles.field}>
          <Text style={styles.label}>Data</Text>
          <Pressable style={styles.dateButton} onPress={() => setShowDate((s) => !s)}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.dateText}>{formatDate(toISODate(date))}</Text>
          </Pressable>
          {showDate ? <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} onChange={onDateChange} /> : null}
        </View>

        <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Supermercado, Salário..." autoCapitalize="sentences" />

        <View style={styles.field}>
          <Text style={styles.label}>Categoria</Text>
          {categories.length === 0 ? (
            <Text style={styles.noCategories}>Nenhuma categoria criada ainda. Cadastre uma no perfil.</Text>
          ) : (
            <View style={styles.chips}>
              <Pressable style={[styles.chip, categoryId === null && styles.chipActive]} onPress={() => setCategoryId(null)}>
                <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>Sem categoria</Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable key={c.id} style={[styles.chip, categoryId === c.id && styles.chipActive]} onPress={() => setCategoryId(c.id)}>
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(parseAmount(amount))}</Text>
        </View>

        <Button title={editing ? "Salvar alterações" : `Salvar ${title}`} onPress={handleSubmit} loading={saving} />
      </View>
    </ScrollView>
  );
}
