import React, { useCallback, useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { LineChartCard } from "@/components/LineChartCard";
import { EmptyState } from "@/components/EmptyState";
import { muscleGroupColors, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { getExerciseById, getExerciseHistory, toggleFavoriteExercise } from "@/db/queries";
import { Exercise, ExerciseHistoryPoint } from "@/types";
import { formatWeight } from "@/utils/calculations";
import { formatFriendlyDate, shortDate } from "@/utils/dateHelpers";

export default function ExerciseDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statTile: {
    flex: 1,
    gap: spacing.xs,
  },
  statValue: {
    ...typography.title,
    color: colors.accent,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    ...typography.body,
    color: colors.textSecondary,
  },
  historyValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
}),
    [colors]
  );
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);

  const load = useCallback(async () => {
    const exerciseId = parseInt(id, 10);
    const [ex, hist] = await Promise.all([
      getExerciseById(db, exerciseId),
      getExerciseHistory(db, exerciseId),
    ]);
    setExercise(ex);
    setHistory(hist);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!exercise) {
    return (
      <View style={styles.container}>
        <EmptyState title="Exercise not found" icon="❓" />
      </View>
    );
  }

  const best = history.reduce<ExerciseHistoryPoint | null>((acc, h) => {
    if (!acc || h.estimated1RM > acc.estimated1RM) return h;
    return acc;
  }, null);

  const handleToggleFavorite = async () => {
    await toggleFavoriteExercise(db, exercise.id);
    load();
  };

  const dotColor = muscleGroupColors[exercise.muscleGroup] ?? colors.textTertiary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={styles.name}>{exercise.name}</Text>
          </View>
          <Text style={styles.meta}>
            {exercise.muscleGroup} · {exercise.equipment}
          </Text>
        </View>
        <Pressable onPress={handleToggleFavorite} hitSlop={10}>
          <Text style={{ fontSize: 24, color: exercise.isFavorite ? colors.accent : colors.textTertiary }}>
            {exercise.isFavorite ? "★" : "☆"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statTile}>
          <Text style={styles.statValue}>{best ? formatWeight(best.maxWeight, settings.units) : "—"}</Text>
          <Text style={styles.statLabel}>Best Weight</Text>
        </Card>
        <Card style={styles.statTile}>
          <Text style={styles.statValue}>{best ? `${formatWeight(best.estimated1RM, settings.units)}` : "—"}</Text>
          <Text style={styles.statLabel}>Est. 1RM</Text>
        </Card>
      </View>

      <LineChartCard
        title="Weight Progression"
        labels={history.map((h) => shortDate(h.date))}
        values={history.map((h) => h.maxWeight)}
        suffix={settings.units}
      />

      <Text style={styles.sectionTitle}>History</Text>
      {history.length > 0 ? (
        <Card>
          {[...history].reverse().map((h, index) => (
            <View
              key={h.workoutId}
              style={[styles.historyRow, index < history.length - 1 && styles.historyRowBorder]}
            >
              <Text style={styles.historyDate}>{formatFriendlyDate(h.date)}</Text>
              <Text style={styles.historyValue}>
                {formatWeight(h.maxWeight, settings.units)} × {h.bestReps}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState title="No history yet" subtitle="Add this exercise to a workout to start tracking it." icon="📈" />
        </Card>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
