import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from "expo-router";
import { getStoredThemeMode, saveThemeMode, type ThemeMode } from "@/utils/theme";

export type ThemeColors = {
  primary: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
  success: string;
  income: string;
  expense: string;
  tint: string;
};

export const lightColors: ThemeColors = {
  primary: "#208AEF",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#DC2626",
  success: "#16A34A",
  income: "#16A34A",
  expense: "#DC2626",
  tint: "#E6F4FE",
};

export const darkColors: ThemeColors = {
  primary: "#3B9DF2",
  background: "#0B1220",
  surface: "#1A2233",
  text: "#F8FAFC",
  muted: "#94A3B8",
  border: "#2B3A52",
  danger: "#F87171",
  success: "#4ADE80",
  income: "#4ADE80",
  expense: "#F87171",
  tint: "#1E3A5F",
};

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  navTheme: NavigationTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let cancelled = false;
    getStoredThemeMode().then((stored) => {
      if (!cancelled && stored) {
        setModeState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const colors = isDark ? darkColors : lightColors;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    saveThemeMode(next);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors]);

  const navTheme = useMemo<NavigationTheme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

  const value = useMemo<ThemeContextValue>(() => ({ colors, isDark, mode, setMode, navTheme }), [colors, isDark, mode, setMode, navTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}
