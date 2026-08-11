import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { authenticateWithBiometrics, canUseBiometrics, setBiometricEnabled } from "@/utils/biometrics";

type BiometricPromptContextValue = {
  requestBiometricPrompt: () => void;
};

const BiometricPromptContext = createContext<BiometricPromptContextValue | null>(null);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 400,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    text: {
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
      marginBottom: 16,
    },
  });
}

export function BiometricPromptProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const requestBiometricPrompt = useCallback(() => {
    setNotice(null);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setLoading(false);
  }, []);

  const enable = async () => {
    setLoading(true);
    const available = await canUseBiometrics();
    if (!available) {
      setLoading(false);
      setNotice("Seu aparelho não tem biometria disponível. Você pode ativar depois no Perfil.");
      return;
    }
    const success = await authenticateWithBiometrics("Confirme sua digital ou rosto");
    setLoading(false);
    if (success) {
      await setBiometricEnabled(true);
      close();
    }
  };

  const value = useMemo<BiometricPromptContextValue>(() => ({ requestBiometricPrompt }), [requestBiometricPrompt]);

  return (
    <BiometricPromptContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Acessar com biometria?</Text>
            <Text style={styles.text}>
              {notice ??
                "Quer desbloquear o app com sua digital ou rosto nas próximas vezes? Você pode mudar isso depois na aba Perfil."}
            </Text>
            <Button title="Sim, ativar biometria" onPress={enable} loading={loading} />
            <Button title="Agora não" onPress={close} variant="ghost" disabled={loading} />
          </View>
        </View>
      </Modal>
    </BiometricPromptContext.Provider>
  );
}

export function useBiometricPrompt() {
  const ctx = useContext(BiometricPromptContext);
  if (!ctx) {
    throw new Error("useBiometricPrompt deve ser usado dentro de BiometricPromptProvider");
  }
  return ctx;
}
