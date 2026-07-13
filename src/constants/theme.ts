export type ThemeMode = "dark" | "light";

export interface Colors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  accent: string;
  accentMuted: string;
  accentText: string;
  success: string;
  danger: string;
  warning: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  overlay: string;
}

export const ACCENT_PRESETS = [
  "#D4AF37", // gold (default — Atlas brand accent)
  "#4B9FFF", // blue
  "#3DDC84", // green
  "#FF5A5F", // red
  "#C77DFF", // purple
  "#FF5A9E", // pink
  "#FFC24B", // yellow
  "#38C6C6", // teal
];

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Picks black or white text for readable contrast against an arbitrary accent color. */
function contrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#14100C" : "#FFFFFF";
}

const darkBase: Omit<Colors, "accent" | "accentMuted" | "accentText"> = {
  background: "#0B0B0C",
  surface: "#161618",
  surfaceElevated: "#1D1D20",
  border: "#242428",
  success: "#3DDC84",
  danger: "#FF5A5F",
  warning: "#D97706",
  textPrimary: "#FFFFFF",
  textSecondary: "#B8B8C0",
  textTertiary: "#6E6E76",
  overlay: "rgba(0,0,0,0.6)",
};

const lightBase: Omit<Colors, "accent" | "accentMuted" | "accentText"> = {
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceElevated: "#F0F0F1",
  border: "#E4E4E7",
  success: "#1FAA5F",
  danger: "#E23F45",
  warning: "#B5790A",
  textPrimary: "#0B0B0C",
  textSecondary: "#6B6B76",
  textTertiary: "#9A9AA2",
  overlay: "rgba(0,0,0,0.3)",
};

export function getColors(mode: ThemeMode, accent: string): Colors {
  const base = mode === "dark" ? darkBase : lightBase;
  return {
    ...base,
    accent,
    accentMuted: hexToRgba(accent, mode === "dark" ? 0.22 : 0.15),
    accentText: contrastText(accent),
  };
}

// Default (dark, gold accent) colors — used only as a fallback before
// settings load. Screens should get live colors from useTheme().
export const colors: Colors = getColors("dark", ACCENT_PRESETS[0]);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  heroNumber: { fontSize: 44, fontWeight: "800" as const, letterSpacing: -1 },
  largeTitle: { fontSize: 32, fontWeight: "800" as const },
  title: { fontSize: 22, fontWeight: "700" as const },
  headline: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "500" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  tiny: { fontSize: 11, fontWeight: "600" as const },
  // Section-label micro style for Direction B: uppercase, letter-spaced,
  // tertiary color, used in place of a headline title above list sections.
  eyebrow: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1, textTransform: "uppercase" as const },
};

export const muscleGroupColors: Record<string, string> = {
  Chest: "#FF6B35",
  Back: "#4B9FFF",
  Legs: "#3DDC84",
  Shoulders: "#FFC24B",
  Arms: "#C77DFF",
  Core: "#FF5A9E",
  Cardio: "#FF5A5F",
  Other: "#A0A0A8",
};
