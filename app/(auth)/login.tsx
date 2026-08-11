import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Button, Screen, TextField } from "@/components/ui";
import { useTheme, type ThemeColors } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      justifyContent: "center",
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 15,
      color: colors.muted,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      marginBottom: 12,
      textAlign: "center",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      marginTop: 24,
    },
    footerText: {
      color: colors.muted,
      fontSize: 15,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Finanças</Text>
          <Text style={styles.subtitle}>Entre com sua conta para continuar</Text>
        </View>

        <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" />
        <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry showPasswordToggle />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Entrar" onPress={handleLogin} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.link}>Cadastre-se</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
