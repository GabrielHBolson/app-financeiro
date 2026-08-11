import * as SecureStore from "expo-secure-store";

const THEME_MODE_KEY = "theme_mode";

export type ThemeMode = "system" | "light" | "dark";

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  try {
    const value = await SecureStore.getItemAsync(THEME_MODE_KEY);
    if (value === "system" || value === "light" || value === "dark") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    if (mode === "system") {
      await SecureStore.deleteItemAsync(THEME_MODE_KEY);
    } else {
      await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
    }
  } catch {
    // ignora
  }
}
