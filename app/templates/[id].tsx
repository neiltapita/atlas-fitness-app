import React, { useCallback, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";
import { useSettings } from "@/context/SettingsContext";
import {
  addTemplateSet,
  addWarmupTemplateSet,
  deleteTemplateSet,
  getTemplateDetail,
  removeExerciseFromTemplate,
  renameTemplate,
  updateTemplateExerciseNotes,
  updateTemplateExerciseStickyNote,
  updateTemplateSet,
} from "@/db/queries";
import { TemplateExerciseWithSets, WorkoutTemplateDetail } from "@/types";
import { haptics } from "@/utils/haptics";

export default function TemplateDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  nameInput: {
    ...typography.title,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseCard: {
    padding: 0,
    overflow: "hidden",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  exerciseName: {
    ...typography.headline,
    color: colors.accent,
  },
  exerciseMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  noteText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  stickyNote: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stickyNoteText: {
    ...typography.caption,
    color: "#3A2A00",
    fontWeight: "700",
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  columnHeaderSet: {
    ...typography.tiny,
    color: colors.textTertiary,
    width: 32,
    textAlign: "center",
  },
  columnHeader: {
    ...typography.tiny,
    color: colors.textTertiary,
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  setNumberBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberBoxWarmup: {
    backgroundColor: colors.accentMuted,
  },
  setNumberText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
    textAlign: "center",
  },
  addSetButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignSelf: "stretch",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
}),
    [colors]
  );
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = parseInt(id, 10);
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { startFromTemplate } = useActiveWorkout();

  const [detail, setDetail] = useState<WorkoutTemplateDetail | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const load = useCallback(async () => {
    const d = await getTemplateDetail(db, templateId);
    setDetail(d);
    if (d) setNameDraft(d.name);
  }, [db, templateId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const commitName = async () => {
    const finalName = nameDraft.trim() || "Template";
    await renameTemplate(db, templateId, finalName);
    load();
  };

  const handleRemoveExercise = (templateExerciseId: number, exerciseName: string) => {
    Alert.alert("Remove Exercise", `Remove ${exerciseName} from this template?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          haptics.warning();
          await removeExerciseFromTemplate(db, templateExerciseId);
          load();
        },
      },
    ]);
  };

  const handleAddSet = async (templateExerciseId: number) => {
    haptics.tap();
    await addTemplateSet(db, templateExerciseId);
    load();
  };

  const handleDeleteSet = async (templateSetId: number) => {
    haptics.warning();
    await deleteTemplateSet(db, templateSetId);
    load();
  };

  const handleSetFieldChange = (
    templateExerciseId: number,
    templateSetId: number,
    fields: { weight?: number; reps?: number }
  ) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.id !== templateExerciseId
                ? e
                : { ...e, sets: e.sets.map((s) => (s.id === templateSetId ? { ...s, ...fields } : s)) }
            ),
          }
        : prev
    );
    updateTemplateSet(db, templateSetId, fields);
  };

  const handleExerciseMenu = (exercise: TemplateExerciseWithSets) => {
    const options = [
      "Add Note",
      "Add Sticky Note",
      "Add Warm-up Set",
      "Replace Exercise",
      "Remove Exercise",
      "Cancel",
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex: 4,
        cancelButtonIndex: 5,
        title: exercise.exerciseName,
      },
      async (index) => {
        switch (index) {
          case 0:
            Alert.prompt(
              "Add Note",
              undefined,
              async (text) => {
                await updateTemplateExerciseNotes(db, exercise.id, text || null);
                load();
              },
              "plain-text",
              exercise.notes ?? ""
            );
            break;
          case 1:
            Alert.prompt(
              "Add Sticky Note",
              "Shown as a banner on this exercise, e.g. \"one set wide grip, one set shoulder width\".",
              async (text) => {
                await updateTemplateExerciseStickyNote(db, exercise.id, text || null);
                load();
              },
              "plain-text",
              exercise.stickyNote ?? ""
            );
            break;
          case 2:
            haptics.tap();
            await addWarmupTemplateSet(db, exercise.id);
            load();
            break;
          case 3:
            router.push({
              pathname: "/exercise/picker",
              params: { replaceTemplateExerciseId: String(exercise.id) },
            });
            break;
          case 4:
            handleRemoveExercise(exercise.id, exercise.exerciseName ?? "exercise");
            break;
          default:
            break;
        }
      }
    );
  };

  const handleStart = async () => {
    haptics.success();
    await startFromTemplate(templateId, settings.defaultRestSeconds);
    router.push("/workout/active");
  };

  if (!detail) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TextInput
        style={styles.nameInput}
        value={nameDraft}
        onChangeText={setNameDraft}
        onEndEditing={commitName}
        placeholder="Template name"
        placeholderTextColor={colors.textTertiary}
      />

      <FlatList
        data={detail.exercises}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title="No exercises yet"
            subtitle="Add exercises this template should include."
            icon="🏋️"
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                  {item.muscleGroup} · {item.equipment}
                </Text>
              </View>
              <Pressable onPress={() => handleExerciseMenu(item)} style={styles.menuButton} hitSlop={8}>
                <Text style={styles.menuButtonText}>•••</Text>
              </Pressable>
            </View>

            {item.notes ? <Text style={styles.noteText}>{item.notes}</Text> : null}
            {item.stickyNote ? (
              <View style={styles.stickyNote}>
                <Text style={styles.stickyNoteText}>{item.stickyNote}</Text>
              </View>
            ) : null}

            <View style={styles.columnHeaderRow}>
              <Text style={styles.columnHeaderSet}>Set</Text>
              <Text style={styles.columnHeader}>{settings.units}</Text>
              <Text style={styles.columnHeader}>Reps</Text>
            </View>

            {item.sets.map((set, idx) => (
              <View key={set.id} style={styles.setRow}>
                <Pressable
                  onLongPress={() => handleDeleteSet(set.id)}
                  style={[styles.setNumberBox, set.isWarmup && styles.setNumberBoxWarmup]}
                >
                  <Text style={styles.setNumberText}>{set.isWarmup ? "W" : idx + 1}</Text>
                </Pressable>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={set.weight ? String(set.weight) : ""}
                  onChangeText={(t) => handleSetFieldChange(item.id, set.id, { weight: parseFloat(t) || 0 })}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={set.reps ? String(set.reps) : ""}
                  onChangeText={(t) => handleSetFieldChange(item.id, set.id, { reps: parseInt(t, 10) || 0 })}
                />
              </View>
            ))}

            <PrimaryButton
              title="+ Add Set"
              variant="ghost"
              size="medium"
              onPress={() => handleAddSet(item.id)}
              style={styles.addSetButton}
            />
          </Card>
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="+ Add Exercise"
          variant="secondary"
          onPress={() => router.push({ pathname: "/exercise/picker", params: { templateId: String(templateId) } })}
          style={styles.footerButton}
        />
        <PrimaryButton
          title="Start Workout"
          onPress={handleStart}
          disabled={detail.exercises.length === 0}
          style={styles.footerButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
