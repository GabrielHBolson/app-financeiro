import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { BiometricGate } from "@/components/biometric-gate";
import { BiometricPromptProvider } from "@/hooks/biometric-prompt";

export default function RootLayout() {
  return (
    <AuthProvider>
      <BiometricPromptProvider>
        <BiometricGate>
          <RootNavigator />
        </BiometricGate>
      </BiometricPromptProvider>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
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

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
