import React, { createContext, useContext, useMemo } from "react";
import { Colors, getColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsContext";

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getColors(settings.theme, settings.accentColor);
    return { colors, isDark: settings.theme === "dark" };
  }, [settings.theme, settings.accentColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
