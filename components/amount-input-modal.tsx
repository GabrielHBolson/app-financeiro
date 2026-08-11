import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, TextField } from "@/components/ui";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { parseAmount } from "@/utils/format";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
    },
  });
}

export function AmountInputModal({
  visible,
  defaultValue,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  defaultValue: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [amount, setAmount] = useState(() => String(defaultValue).replace(".", ","));

  const handleConfirm = () => {
    const value = parseAmount(amount);
    if (value <= 0) {
      return;
    }
    onConfirm(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title}>Valor pago</Text>
        <TextField label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
        <View style={styles.row}>
          <Button title="Cancelar" onPress={onClose} variant="ghost" />
          <Button title="Confirmar" onPress={handleConfirm} />
        </View>
      </View>
    </Modal>
  );
}
