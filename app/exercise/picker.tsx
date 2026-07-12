import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ExerciseListItem } from "@/components/ExerciseListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import {
  searchExercises,
  createCustomExercise,
  toggleFavoriteExercise,
  addExerciseToWorkout,
  addExerciseToTemplate,
  replaceTemplateExercise,
} from "@/db/queries";
import { Exercise, MuscleGroup } from "@/types";
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from "@/constants/exercises";

export default function ExercisePickerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchInput: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  chipRow: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: "#1A0E06",
    fontWeight: "700",
  },
  createLink: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
  },
  createForm: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  createInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  createButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  createButton: {
    flex: 1,
  },
  resultsList: {
    flex: 1,
  },
}),
    [colors]
  );
  const { workoutId, templateId, replaceTemplateExerciseId } = useLocalSearchParams<{
    workoutId?: string;
    templateId?: string;
    replaceTemplateExerciseId?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "All">("All");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup>("Other");
  const [newEquipment, setNewEquipment] = useState("Other");

  const load = useCallback(async () => {
    const results = await searchExercises(db, query, filter);
    setExercises(results);
  }, [db, query, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePick = async (exerciseId: number) => {
    if (replaceTemplateExerciseId) {
      await replaceTemplateExercise(db, parseInt(replaceTemplateExerciseId, 10), exerciseId);
      router.back();
      return;
    }
    if (templateId) {
      await addExerciseToTemplate(db, parseInt(templateId, 10), exerciseId);
      router.back();
      return;
    }
    if (!workoutId) {
      router.back();
      return;
    }
    await addExerciseToWorkout(db, parseInt(workoutId, 10), exerciseId);
    router.back();
  };

  const handleToggleFavorite = async (exerciseId: number) => {
    await toggleFavoriteExercise(db, exerciseId);
    load();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createCustomExercise(db, newName.trim(), newMuscleGroup, newEquipment);
    setNewName("");
    setShowCreate(false);
    await handlePick(id);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {(["All", ...MUSCLE_GROUPS] as const).map((group) => (
          <Pressable
            key={group}
            onPress={() => setFilter(group)}
            style={[styles.chip, filter === group && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === group && styles.chipTextActive]}>{group}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {showCreate ? (
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder="Exercise name"
            placeholderTextColor={colors.textTertiary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {MUSCLE_GROUPS.map((group) => (
              <Pressable
                key={group}
                onPress={() => setNewMuscleGroup(group)}
                style={[styles.chip, newMuscleGroup === group && styles.chipActive]}
              >
                <Text style={[styles.chipText, newMuscleGroup === group && styles.chipTextActive]}>
                  {group}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <Pressable
                key={eq}
                onPress={() => setNewEquipment(eq)}
                style={[styles.chip, newEquipment === eq && styles.chipActive]}
              >
                <Text style={[styles.chipText, newEquipment === eq && styles.chipTextActive]}>{eq}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.createButtons}>
            <PrimaryButton
              title="Cancel"
              variant="secondary"
              size="medium"
              onPress={() => setShowCreate(false)}
              style={styles.createButton}
            />
            <PrimaryButton title="Create & Add" size="medium" onPress={handleCreate} style={styles.createButton} />
          </View>
        </View>
      ) : (
        <PrimaryButton
          title="+ Create Custom Exercise"
          variant="ghost"
          onPress={() => {
            setNewName(query);
            setShowCreate(true);
          }}
          style={styles.createLink}
        />
      )}

      <FlatList
        style={styles.resultsList}
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState title="No exercises found" icon="🔍" />}
        renderItem={({ item }) => (
          <ExerciseListItem
            exercise={item}
            onPress={() => handlePick(item.id)}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}
