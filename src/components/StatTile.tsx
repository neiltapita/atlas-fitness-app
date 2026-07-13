import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface StatTileProps {
  label: string;
  value: string;
  accentColor?: string;
  sub?: string;
  /** Renders a hairline left divider, matching the flush-typography stat-row
   * treatment. Pass false for the first tile in a row (nothing to divide from). */
  dividerLeft?: boolean;
}

export function StatTile({ label, value, accentColor, sub, dividerLeft = true }: StatTileProps) {
  const { colors } = useTheme();
  const resolvedValueColor = accentColor ?? colors.textPrimary;
  const styles = useMemo(
    () =>
      StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs,
    paddingLeft: dividerLeft ? spacing.lg : 0,
    borderLeftWidth: dividerLeft ? 1 : 0,
    borderLeftColor: colors.border,
  },
  value: {
    ...typography.heroNumber,
  },
  label: {
    ...typography.eyebrow,
    color: colors.textTertiary,
  },
  sub: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
}),
    [colors, dividerLeft]
  );
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: resolvedValueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}
