import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface StatTileProps {
  label: string;
  value: string;
  accentColor?: string;
  sub?: string;
}

export function StatTile({ label, value, accentColor, sub }: StatTileProps) {
  const { colors } = useTheme();
  const resolvedAccentColor = accentColor ?? colors.accent;
  const styles = useMemo(
    () =>
      StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs,
  },
  value: {
    ...typography.title,
    color: colors.accent,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sub: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
}),
    [colors]
  );
  return (
    <Card style={styles.tile}>
      <Text style={[styles.value, { color: resolvedAccentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </Card>
  );
}
