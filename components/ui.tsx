import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
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
    inputWrap: {
      position: "relative",
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    inputWithToggle: {
      paddingRight: 44,
    },
    toggle: {
      position: "absolute",
      right: 4,
      top: 0,
      bottom: 0,
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    button: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
    buttonTextGhost: {
      color: colors.primary,
    },
  });
}

export function Screen({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showPasswordToggle,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const masked = secureTextEntry && !visible;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, showPasswordToggle && styles.inputWithToggle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={masked}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
        />
        {showPasswordToggle ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} style={styles.toggle} accessibilityRole="button" accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}>
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={[styles.button, isPrimary ? styles.buttonPrimary : styles.buttonGhost, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color={isPrimary ? "#FFFFFF" : colors.primary} /> : <Text style={[styles.buttonText, !isPrimary && styles.buttonTextGhost]}>{title}</Text>}
    </Pressable>
  );
}
