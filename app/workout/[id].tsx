import React, { useCallback, useState, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";
import { getWorkoutDetail, deleteWorkout, repeatWorkout } from "@/db/queries";
import { WorkoutDetail } from "@/types";
import { formatDuration, formatWeight } from "@/utils/calculations";
import { formatFriendlyDate, formatTime } from "@/utils/dateHelpers";

export default function WorkoutDetailScreen() {
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
  name: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryTile: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryValue: {
    ...typography.title,
    color: colors.accent,
  },
  summaryLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  exerciseCard: {
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  setRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  setIndex: {
    ...typography.caption,
    color: colors.textTertiary,
    width: 20,
  },
  setText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  noSets: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
}),
    [colors]
  );
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { refreshActiveWorkout } = useActiveWorkout();
  const [detail, setDetail] = useState<WorkoutDetail | null>(null);

  const load = useCallback(async () => {
    const d = await getWorkoutDetail(db, parseInt(id, 10));
    setDetail(d);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!detail) {
    return (
      <View style={styles.container}>
        <EmptyState title="Workout not found" icon="❓" />
      </View>
    );
  }

  const handleRepeat = async () => {
    await repeatWorkout(db, detail.id);
    await refreshActiveWorkout();
    router.push("/workout/active");
  };

  const handleDelete = () => {
    Alert.alert("Delete Workout", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkout(db, detail.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{detail.name}</Text>
      <Text style={styles.meta}>
        {formatFriendlyDate(detail.date)} · {formatTime(detail.startedAt)} ·{" "}
        {formatDuration(detail.startedAt, detail.finishedAt)}
      </Text>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{formatWeight(detail.totalVolume, settings.units)}</Text>
          <Text style={styles.summaryLabel}>Total Volume</Text>
        </Card>
        <Card style={styles.summaryTile}>
          <Text style={styles.summaryValue}>
            {detail.bestSet ? `${formatWeight(detail.bestSet.weight, settings.units)}` : "—"}
          </Text>
          <Text style={styles.summaryLabel}>
            {detail.bestSet ? `Best Set · ${detail.bestSet.exerciseName}` : "Best Set"}
          </Text>
        </Card>
      </View>

      {detail.exercises.map((exercise) => (
        <Card key={exercise.id} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.sets
            .filter((s) => s.completed)
            .map((set, idx) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setIndex}>{idx + 1}</Text>
                <Text style={styles.setText}>
                  {formatWeight(set.weight, settings.units)} × {set.reps}
                  {set.rpe ? ` @ RPE ${set.rpe}` : ""}
                </Text>
              </View>
            ))}
          {exercise.sets.filter((s) => s.completed).length === 0 ? (
            <Text style={styles.noSets}>No completed sets</Text>
          ) : null}
        </Card>
      ))}

      {detail.notes ? (
        <Card>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{detail.notes}</Text>
        </Card>
      ) : null}

      <PrimaryButton title="Repeat This Workout" onPress={handleRepeat} style={styles.actionButton} />
      <PrimaryButton title="Delete Workout" variant="danger" onPress={handleDelete} style={styles.actionButton} />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
