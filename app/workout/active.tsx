import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SetRow } from "@/components/SetRow";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";
import { useSettings } from "@/context/SettingsContext";
import {
  getWorkoutDetail,
  renameWorkout,
  addSet,
  updateSet,
  deleteSet,
  removeExerciseFromWorkout,
} from "@/db/queries";
import { WorkoutDetail } from "@/types";
import { formatClock, formatWeight } from "@/utils/calculations";
import { haptics } from "@/utils/haptics";

export default function ActiveWorkoutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  backButton: {
    marginHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    ...typography.body,
    color: colors.danger,
  },
  elapsed: {
    ...typography.headline,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  finishText: {
    ...typography.headline,
    color: colors.accent,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  nameInput: {
    ...typography.title,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  volumeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exerciseCard: {
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  exerciseName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  exerciseMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  removeText: {
    ...typography.tiny,
    color: colors.danger,
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  columnHeaderSet: {
    ...typography.tiny,
    color: colors.textTertiary,
    width: 28,
    textAlign: "center",
  },
  columnHeader: {
    ...typography.tiny,
    color: colors.textTertiary,
    flex: 1,
    textAlign: "center",
  },
  columnHeaderSmall: {
    ...typography.tiny,
    color: colors.textTertiary,
    width: 52,
    textAlign: "center",
  },
  columnHeaderCheck: {
    ...typography.tiny,
    color: colors.textTertiary,
    width: 32,
    textAlign: "center",
  },
  addSetButton: {
    alignSelf: "flex-start",
  },
  addExerciseButton: {
    marginTop: spacing.sm,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { activeWorkoutId, finishActiveWorkout, cancelActiveWorkout } = useActiveWorkout();

  const [detail, setDetail] = useState<WorkoutDetail | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [elapsed, setElapsed] = useState("00:00");

  const loadDetail = useCallback(async () => {
    if (activeWorkoutId == null) return;
    const d = await getWorkoutDetail(db, activeWorkoutId);
    setDetail(d);
    if (d) setNameDraft(d.name);
  }, [db, activeWorkoutId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    if (!detail) return;
    const interval = setInterval(() => {
      setElapsed(formatClock(detail.startedAt));
    }, 1000);
    setElapsed(formatClock(detail.startedAt));
    return () => clearInterval(interval);
  }, [detail]);

  if (activeWorkoutId == null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <EmptyState title="No active workout" subtitle="Start one from the Home or Workout tab." icon="🏋️" />
        <PrimaryButton title="Back" variant="secondary" onPress={() => router.back()} style={styles.backButton} />
      </SafeAreaView>
    );
  }

  const commitName = async () => {
    const finalName = nameDraft.trim() || "Workout";
    await renameWorkout(db, activeWorkoutId, finalName);
    loadDetail();
  };

  const handleAddSet = async (workoutExerciseId: number) => {
    await addSet(db, workoutExerciseId, settings.defaultRestSeconds);
    loadDetail();
  };

  const handleSetChange = (
    setId: number,
    workoutExerciseId: number,
    fields: Parameters<typeof updateSet>[2]
  ) => {
    // Optimistic local update so typing feels instant.
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id !== workoutExerciseId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
              }
        ),
      };
    });
    updateSet(db, setId, fields);
  };

  const handleCompleteSet = (setId: number, workoutExerciseId: number) => {
    const exercise = detail?.exercises.find((e) => e.id === workoutExerciseId);
    const set = exercise?.sets.find((s) => s.id === setId);
    if (!set) return;
    handleSetChange(setId, workoutExerciseId, { completed: !set.completed });
  };

  const handleDeleteSet = async (setId: number) => {
    await deleteSet(db, setId);
    loadDetail();
  };

  const handleRemoveExercise = (workoutExerciseId: number, exerciseName: string) => {
    Alert.alert("Remove Exercise", `Remove ${exerciseName} from this workout?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeExerciseFromWorkout(db, workoutExerciseId);
          loadDetail();
        },
      },
    ]);
  };

  const handleFinish = () => {
    const totalSets = detail?.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0) ?? 0;
    if (totalSets === 0) {
      Alert.alert("No completed sets", "Log at least one completed set before finishing, or cancel this workout.");
      return;
    }
    Alert.alert("Finish Workout", "Great work! Save and finish this workout?", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          haptics.success();
          await finishActiveWorkout();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Cancel Workout", "This will discard the entire workout. Are you sure?", [
      { text: "Keep Workout", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          await cancelActiveWorkout();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.elapsed}>{elapsed}</Text>
        <Pressable onPress={handleFinish} hitSlop={10}>
          <Text style={styles.finishText}>Finish</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.nameInput}
          value={nameDraft}
          onChangeText={setNameDraft}
          onEndEditing={commitName}
          placeholder="Workout name"
          placeholderTextColor={colors.textTertiary}
        />

        {detail && detail.totalVolume > 0 ? (
          <Text style={styles.volumeText}>
            Total volume: {formatWeight(detail.totalVolume, settings.units)}
          </Text>
        ) : null}

        {detail?.exercises.map((exercise) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.muscleGroup} · {exercise.equipment}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveExercise(exercise.id, exercise.exerciseName ?? "exercise")}
                hitSlop={10}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>

            <View style={styles.columnHeaderRow}>
              <Text style={styles.columnHeaderSet}>Set</Text>
              <Text style={styles.columnHeader}>Weight</Text>
              <Text style={styles.columnHeader}>Reps</Text>
              <Text style={styles.columnHeaderSmall}>RPE</Text>
              <Text style={styles.columnHeaderCheck}>✓</Text>
            </View>

            {exercise.sets.map((set, idx) => (
              <SetRow
                key={set.id}
                set={set}
                setIndex={idx}
                unit={settings.units}
                onChange={(fields) => handleSetChange(set.id, exercise.id, fields)}
                onDelete={() => handleDeleteSet(set.id)}
                onComplete={() => handleCompleteSet(set.id, exercise.id)}
              />
            ))}

            <PrimaryButton
              title="+ Add Set"
              variant="ghost"
              size="medium"
              onPress={() => handleAddSet(exercise.id)}
              style={styles.addSetButton}
            />
          </Card>
        ))}

        <PrimaryButton
          title="+ Add Exercise"
          variant="secondary"
          onPress={() => router.push({ pathname: "/exercise/picker", params: { workoutId: String(activeWorkoutId) } })}
          style={styles.addExerciseButton}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
