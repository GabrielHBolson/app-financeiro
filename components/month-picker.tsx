import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/components/ui";
import { addMonths, currentMonthLabel } from "@/utils/format";

export function MonthPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const isCurrentMonth = (() => {
    const now = new Date();
    return now.getFullYear() === value.getFullYear() && now.getMonth() === value.getMonth();
  })();

  return (
    <View style={styles.row}>
      <Pressable style={styles.arrow} onPress={() => onChange(addMonths(value, -1))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mês anterior">
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <Text style={styles.label}>{currentMonthLabel(value)}</Text>
      <Pressable style={styles.arrow} onPress={() => onChange(addMonths(value, 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Próximo mês">
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </Pressable>
      {isCurrentMonth ? (
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>Atual</Text>
        </View>
      ) : (
        <Pressable style={styles.todayBadge} onPress={() => onChange(new Date())} hitSlop={8}>
          <Text style={styles.todayText}>Hoje</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  todayBadge: {
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
