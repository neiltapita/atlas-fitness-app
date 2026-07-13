import React, { useCallback, useState, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";
import { getTemplates, getWorkoutSummaries, repeatWorkout } from "@/db/queries";
import { WorkoutSummary, WorkoutTemplate } from "@/types";
import { formatFriendlyDate } from "@/utils/dateHelpers";
import { formatWeight } from "@/utils/calculations";
import { useSettings } from "@/context/SettingsContext";

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  activeText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  createLink: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  createLinkText: {
    ...typography.body,
    color: colors.accent,
    textDecorationLine: "underline",
  },
  templatesSection: {
    gap: 0,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { activeWorkoutId, startWorkout, refreshActiveWorkout } = useActiveWorkout();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const loadData = useCallback(async () => {
    const summaries = await getWorkoutSummaries(db, 10);
    // Deduplicate by name so this reads as a list of routines to repeat.
    const seen = new Set<string>();
    const unique: WorkoutSummary[] = [];
    for (const w of summaries) {
      if (seen.has(w.name)) continue;
      seen.add(w.name);
      unique.push(w);
    }
    setRecentWorkouts(unique);
    setTemplates(await getTemplates(db));
    await refreshActiveWorkout();
  }, [db, refreshActiveWorkout]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const startEmpty = useCallback(async () => {
    await startWorkout("New Workout");
    router.push("/workout/active");
  }, [startWorkout, router]);

  const repeatPreviousWorkout = useCallback(
    async (workoutId: number) => {
      await repeatWorkout(db, workoutId);
      await refreshActiveWorkout();
      router.push("/workout/active");
    },
    [db, refreshActiveWorkout, router]
  );

  const openTemplate = useCallback(
    (templateId: number) => {
      router.push({ pathname: "/templates/[id]", params: { id: String(templateId) } });
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout</Text>
      </View>

      <View style={styles.content}>
        {activeWorkoutId != null ? (
          <View style={styles.activeBanner}>
            <Text style={styles.activeText}>Workout in progress</Text>
            <PrimaryButton
              title="Resume"
              size="medium"
              variant="outline"
              onPress={() => router.push("/workout/active")}
            />
          </View>
        ) : (
          <PrimaryButton title="Start Empty Workout" variant="outline" onPress={startEmpty} />
        )}

        <Pressable style={styles.createLink} onPress={() => router.push("/workout/create")}>
          <Text style={styles.createLinkText}>Create Named Workout</Text>
        </Pressable>
      </View>

      <FlatList
        data={recentWorkouts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.templatesSection}>
            <SectionHeader
              title="My Templates"
              actionLabel="Manage"
              onAction={() => router.push("/templates")}
            />
            {templates.length === 0 ? (
              <Pressable onPress={() => router.push("/templates/create")}>
                <View style={styles.row}>
                  <Text style={styles.rowName}>+ Create your first template</Text>
                  <Text style={styles.rowMeta}>e.g. Push, Pull, Legs</Text>
                </View>
              </Pressable>
            ) : (
              templates.map((t, index) => (
                <Pressable key={t.id} onPress={() => openTemplate(t.id)}>
                  <View style={[styles.row, index > 0 && styles.rowDivider]}>
                    <Text style={styles.rowName}>{t.name}</Text>
                    <Text style={styles.rowMeta}>Tap to view</Text>
                  </View>
                </Pressable>
              ))
            )}
            <SectionHeader title="Start From Previous" />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No previous workouts"
            subtitle="Finish your first workout to see it here for quick repeats."
          />
        }
        renderItem={({ item, index }) => (
          <Pressable onPress={() => repeatPreviousWorkout(item.id)}>
            <View style={[styles.row, index > 0 && styles.rowDivider]}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {formatFriendlyDate(item.date)} · {item.exerciseCount} exercises ·{" "}
                {formatWeight(item.totalVolume, settings.units)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
