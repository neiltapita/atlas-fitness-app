import React, { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { hexToRgb, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface LineChartCardProps {
  title: string;
  labels: string[];
  values: number[];
  suffix?: string;
  emptyMessage?: string;
  /** Line/dot color. Defaults to the active accent color; pass a neutral
   * gray (e.g. colors.textTertiary) for secondary charts like volume. */
  lineColor?: string;
}

const screenWidth = Dimensions.get("window").width;

export function LineChartCard({
  title,
  labels,
  values,
  suffix = "",
  emptyMessage = "Log a few workouts to see this chart.",
  lineColor,
}: LineChartCardProps) {
  const { colors } = useTheme();
  const resolvedLineColor = lineColor ?? colors.accent;
  const [r, g, b] = hexToRgb(resolvedLineColor);
  const styles = useMemo(
    () =>
      StyleSheet.create({
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -spacing.lg,
  },
}),
    [colors]
  );
  const hasData = values.length >= 2 && values.some((v) => v > 0);

  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      {hasData ? (
        <LineChart
          data={{
            labels: labels.length > 6 ? thinLabels(labels) : labels,
            datasets: [{ data: values }],
          }}
          width={screenWidth - spacing.lg * 4}
          height={200}
          withInnerLines={false}
          withOuterLines={false}
          chartConfig={{
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            strokeWidth: 2,
            color: (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`,
            labelColor: () => colors.textTertiary,
            propsForDots: { r: "4", strokeWidth: "2", stroke: resolvedLineColor },
            propsForBackgroundLines: { stroke: colors.border },
          }}
          bezier
          style={styles.chart}
          formatYLabel={(y) => `${Math.round(Number(y))}${suffix}`}
        />
      ) : (
        <EmptyState title="Not enough data yet" subtitle={emptyMessage} sparkline />
      )}
    </Card>
  );
}

function thinLabels(labels: string[]): string[] {
  const step = Math.ceil(labels.length / 6);
  return labels.map((l, i) => (i % step === 0 ? l : ""));
}
