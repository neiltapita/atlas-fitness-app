import React, { useCallback, useState, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
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
    gap: spacing.md,
  },
  secondaryButton: {
    marginTop: 0,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templatesSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  activeText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  templateCard: {
    gap: spacing.xs,
  },
  templateName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  templateMeta: {
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
          <Card style={styles.activeBanner}>
            <Text style={styles.activeText}>Workout in progress</Text>
            <PrimaryButton
              title="Resume"
              size="medium"
              onPress={() => router.push("/workout/active")}
            />
          </Card>
        ) : (
          <PrimaryButton title="Start Empty Workout" onPress={startEmpty} />
        )}

        <PrimaryButton
          title="Create Named Workout"
          variant="secondary"
          onPress={() => router.push("/workout/create")}
          style={styles.secondaryButton}
        />
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
                <Card style={styles.templateCard}>
                  <Text style={styles.templateName}>+ Create your first template</Text>
                  <Text style={styles.templateMeta}>e.g. Push, Pull, Legs</Text>
                </Card>
              </Pressable>
            ) : (
              templates.map((t) => (
                <Pressable key={t.id} onPress={() => openTemplate(t.id)}>
                  <Card style={styles.templateCard}>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <Text style={styles.templateMeta}>Tap to view</Text>
                  </Card>
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
            icon="🔁"
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => repeatPreviousWorkout(item.id)}>
            <Card style={styles.templateCard}>
              <Text style={styles.templateName}>{item.name}</Text>
              <Text style={styles.templateMeta}>
                {formatFriendlyDate(item.date)} · {item.exerciseCount} exercises ·{" "}
                {formatWeight(item.totalVolume, settings.units)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
