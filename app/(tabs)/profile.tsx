import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, TextField } from "@/components/ui";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { deleteCategory, getCategories, getProfile, insertCategory, updateProfileName } from "@/services/api";
import type { Category, CategoryType, Profile } from "@/services/types";
import type { ThemeMode } from "@/utils/theme";
import { canUseBiometrics, isBiometricEnabled, setBiometricEnabled } from "@/utils/biometrics";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 20,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.tint,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInfo: {
      flex: 1,
    },
    name: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    email: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardRowText: {
      flex: 1,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    cardValue: {
      fontSize: 15,
      color: colors.muted,
      flex: 1,
      marginRight: 12,
    },
    cardHint: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    cardLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    nameEdit: {
      flex: 1,
      gap: 8,
    },
    themeSegment: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 4,
      marginTop: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
      marginBottom: 12,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 4,
      marginBottom: 16,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 8,
    },
    segmentButtonActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.muted,
    },
    segmentTextActive: {
      color: "#FFFFFF",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryIcon: {
      fontSize: 20,
    },
    categoryName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    categoryType: {
      fontSize: 13,
      fontWeight: "600",
    },
    expenseLabel: {
      color: colors.expense,
    },
    incomeLabel: {
      color: colors.income,
    },
    investedLabel: {
      color: colors.primary,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      fontStyle: "italic",
      marginBottom: 16,
    },
  });
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("expense");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    const p = await getProfile(user.id);
    setProfile(p);
    if (p?.full_name) {
      setName(p.full_name);
    }
    const [enabled, available, cats] = await Promise.all([isBiometricEnabled(), canUseBiometrics(), getCategories()]);
    setBiometricEnabledState(enabled);
    setBiometricAvailable(available);
    setCategories(cats);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSaveName = async () => {
    if (!user || !name.trim()) {
      return;
    }
    setSavingName(true);
    const error = await updateProfileName(user.id, name.trim());
    setSavingName(false);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    setEditingName(false);
    load();
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value && !biometricAvailable) {
      Alert.alert("Indisponível", "Seu aparelho não tem biometria (digital ou rosto) configurada.");
      return;
    }
    await setBiometricEnabled(value);
    setBiometricEnabledState(value);
    Alert.alert(value ? "Ativado" : "Desativado", value ? "O app pedirá sua digital ou rosto ao abrir." : "O desbloqueio por biometria foi desativado.");
  };

  const handleAddCategory = async () => {
    if (!user || !categoryName.trim()) {
      Alert.alert("Dados inválidos", "Informe o nome da categoria.");
      return;
    }
    setSavingCategory(true);
    const error = await insertCategory(user.id, {
      name: categoryName.trim(),
      type: categoryType,
      icon: categoryIcon.trim() || undefined,
    });
    setSavingCategory(false);
    if (error) {
      Alert.alert("Erro", error);
      return;
    }
    setCategoryName("");
    setCategoryIcon("");
    load();
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert("Excluir categoria", `Excluir "${category.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const error = await deleteCategory(category.id);
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
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{profile?.full_name || "Usuário"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>Nome</Text>
            {editingName ? (
              <View style={styles.nameEdit}>
                <TextField label="" value={name} onChangeText={setName} autoCapitalize="words" />
                <Button title="Salvar" onPress={handleSaveName} loading={savingName} />
              </View>
            ) : (
              <>
                <Text style={styles.cardValue}>{profile?.full_name || "—"}</Text>
                <Pressable onPress={() => setEditingName(true)} hitSlop={8}>
                  <Text style={styles.cardLink}>Editar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowText}>
              <Text style={styles.cardTitle}>Desbloqueio com biometria</Text>
              <Text style={styles.cardHint}>Peça sua digital ou rosto ao abrir o app.</Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowText}>
              <Text style={styles.cardTitle}>Tema</Text>
              <Text style={styles.cardHint}>Claro, escuro ou segue o sistema.</Text>
            </View>
          </View>
          <View style={styles.themeSegment}>
            {THEME_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.segmentButton, mode === option.value && styles.segmentButtonActive]}
                onPress={() => setMode(option.value)}
              >
                <Text style={[styles.segmentText, mode === option.value && styles.segmentTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Categorias</Text>
        <View style={styles.card}>
          <View style={styles.segment}>
            {(["expense", "income", "investment"] as const).map((t) => (
              <Pressable key={t} style={[styles.segmentButton, categoryType === t && styles.segmentButtonActive]} onPress={() => setCategoryType(t)}>
                <Text style={[styles.segmentText, categoryType === t && styles.segmentTextActive]}>
                  {t === "expense" ? "Gastos" : t === "income" ? "Recebidos" : "Investimentos"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField label="Nome da categoria" value={categoryName} onChangeText={setCategoryName} placeholder="Ex.: Alimentação" autoCapitalize="sentences" />
          <TextField label="Ícone (emoji, opcional)" value={categoryIcon} onChangeText={setCategoryIcon} placeholder="Ex.: 🍔" />
          <Button title="Adicionar categoria" onPress={handleAddCategory} loading={savingCategory} />
        </View>

        {categories.length > 0 ? (
          <View style={styles.card}>
            {categories.map((c) => (
              <View key={c.id} style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>{c.icon || "•"}</Text>
                <Text style={styles.categoryName}>{c.name}</Text>
                <Text style={[styles.categoryType, c.type === "expense" ? styles.expenseLabel : c.type === "income" ? styles.incomeLabel : styles.investedLabel]}>
                  {c.type === "expense" ? "Gasto" : c.type === "income" ? "Recebido" : "Investimento"}
                </Text>
                <Pressable onPress={() => handleDeleteCategory(c)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Nenhuma categoria. Adicione acima.</Text>
        )}

        <Button title="Sair da conta" onPress={() => signOut()} variant="ghost" />
      </ScrollView>
    </Screen>
  );
}
