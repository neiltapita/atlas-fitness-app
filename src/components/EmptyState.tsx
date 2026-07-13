import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Renders a ghosted dashed sparkline instead of an emoji icon — used for
   * chart-related empty states in place of the old icon treatment. */
  sparkline?: boolean;
}

export function EmptyState({ title, subtitle, icon, sparkline }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  sparkline: {
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
}),
    [colors]
  );
  return (
    <View style={styles.container}>
      {sparkline ? (
        <Svg width={96} height={32} style={styles.sparkline}>
          <Path
            d="M2 24 L22 14 L40 20 L60 8 L78 16 L94 4"
            stroke={colors.textTertiary}
            strokeWidth={2}
            strokeDasharray="4 5"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      ) : icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
