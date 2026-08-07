import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { authenticateWithBiometrics, isBiometricEnabled } from "@/utils/biometrics";
import { colors } from "@/components/ui";

export function BiometricGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setEnabled(null);
    setUnlocked(false);
  }

  useEffect(() => {
    let mounted = true;
    isBiometricEnabled()
      .then((value) => {
        if (mounted) {
          setEnabled(value);
        }
      })
      .catch(() => {
        if (mounted) {
          setEnabled(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (enabled === null) {
    return null;
  }

  if (session && enabled && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [attempting, setAttempting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const tryAuthenticate = async () => {
    setAttempting(true);
    setError(null);
    const success = await authenticateWithBiometrics();
    setAttempting(false);
    if (success) {
      onUnlock();
    } else {
      setError("Não foi possível autenticar. Tente novamente.");
    }
  };

  useEffect(() => {
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      tryAuthenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>App bloqueado</Text>
      <Text style={styles.subtitle}>Use sua digital ou rosto para desbloquear.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={tryAuthenticate} disabled={attempting}>
        <Ionicons name="finger-print" size={22} color="#FFFFFF" />
        <Text style={styles.buttonText}>{attempting ? "Autenticando..." : "Desbloquear"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E6F4FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
  button: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
