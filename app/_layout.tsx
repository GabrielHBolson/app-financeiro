import { useEffect } from "react";
import { Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider as AppThemeProvider, useTheme } from "@/hooks/use-theme";
import { BiometricGate } from "@/components/biometric-gate";
import { BiometricPromptProvider } from "@/hooks/biometric-prompt";
import { getAllBillPayments, getMonthlyBills } from "@/services/api";
import { syncBillReminders } from "@/services/notifications";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <BiometricPromptProvider>
          <BiometricGate>
            <RootNavigator />
          </BiometricGate>
        </BiometricPromptProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { isDark, navTheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    Promise.all([getMonthlyBills(), getAllBillPayments()])
      .then(([bills, payments]) => {
        if (!cancelled) {
          syncBillReminders(bills, payments);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bill/[id]" options={{ headerShown: true }} />
      </Stack>
    </ThemeProvider>
  );
}
