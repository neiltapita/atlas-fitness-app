import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

export interface TabConfig {
  key: string;
  title: string;
  icon: IconName;
}

// `key` matches the route file name under app/(tabs)/.
export const TAB_CONFIG: TabConfig[] = [
  { key: "index", title: "Home", icon: "home" },
  { key: "workout", title: "Workout", icon: "barbell" },
  { key: "nutrition", title: "Nutrition", icon: "nutrition" },
  { key: "history", title: "History", icon: "calendar" },
  { key: "progress", title: "Progress", icon: "trending-up" },
  { key: "settings", title: "Settings", icon: "settings" },
];

export const DEFAULT_TAB_ORDER: string[] = TAB_CONFIG.map((t) => t.key);

export function getTabConfig(key: string): TabConfig {
  return TAB_CONFIG.find((t) => t.key === key) ?? { key, title: key, icon: "ellipse" };
}

/** Ensures every known tab appears exactly once, tolerating a stored order that's missing a newly-added tab. */
export function normalizeTabOrder(order: string[] | null | undefined): string[] {
  const valid = (order ?? []).filter((key) => DEFAULT_TAB_ORDER.includes(key));
  const missing = DEFAULT_TAB_ORDER.filter((key) => !valid.includes(key));
  return [...valid, ...missing];
}
