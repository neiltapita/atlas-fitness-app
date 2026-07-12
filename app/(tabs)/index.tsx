import React, { useCallback, useState, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";
import {
  getTodaysWorkout,
  getLastFinishedWorkout,
  getWeeklyWorkoutCount,
  getCurrentStreak,
  getRecentPersonalRecords,
} from "@/db/queries";
import { WorkoutSummary, PersonalRecord } from "@/types";
import { formatWeight } from "@/utils/calculations";
import { formatFriendlyDate } from "@/utils/dateHelpers";

export default function HomeScreen() {
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
  greeting: {
    ...typography.largeTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  quickStart: {
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  workoutName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  workoutMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inProgressTag: {
    ...typography.tiny,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  prRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prExercise: {
    ...typography.body,
    color: colors.textPrimary,
  },
  prValue: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { activeWorkoutId, startWorkout, refreshActiveWorkout } = useActiveWorkout();

  const [refreshing, setRefreshing] = useState(false);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutSummary | null>(null);
  const [lastWorkout, setLastWorkout] = useState<WorkoutSummary | null>(null);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);

  const loadData = useCallback(async () => {
    const [today, last, weekly, streakVal, prs] = await Promise.all([
      getTodaysWorkout(db),
      getLastFinishedWorkout(db),
      getWeeklyWorkoutCount(db),
      getCurrentStreak(db),
      getRecentPersonalRecords(db, 5),
    ]);
    setTodaysWorkout(today);
    setLastWorkout(last);
    setWeeklyCount(weekly);
    setStreak(streakVal);
    setRecentPRs(prs);
    await refreshActiveWorkout();
  }, [db, refreshActiveWorkout]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleQuickStart = useCallback(async () => {
    if (activeWorkoutId != null) {
      router.push("/workout/active");
      return;
    }
    const name = `Workout · ${new Date().toLocaleDateString(undefined, {
      weekday: "long",
    })}`;
    await startWorkout(name);
    router.push("/workout/active");
  }, [activeWorkoutId, router, startWorkout]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor={colors.accent} refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Let's train</Text>

      <PrimaryButton
        title={activeWorkoutId != null ? "Resume Workout" : "Quick Start Workout"}
        onPress={handleQuickStart}
        style={styles.quickStart}
      />

      <View style={styles.statsRow}>
        <StatTile label="This week" value={`${weeklyCount}`} sub="workouts" />
        <StatTile label="Streak" value={`${streak}`} sub={streak === 1 ? "day" : "days"} accentColor={colors.success} />
      </View>

      <SectionHeader title="Today's Workout" />
      {todaysWorkout ? (
        <Card style={styles.card}>
          <Text style={styles.workoutName}>{todaysWorkout.name}</Text>
          <Text style={styles.workoutMeta}>
            {todaysWorkout.exerciseCount} exercises · {todaysWorkout.setCount} sets ·{" "}
            {formatWeight(todaysWorkout.totalVolume, settings.units)} volume
          </Text>
          {!todaysWorkout.finishedAt ? (
            <Text style={styles.inProgressTag}>In progress</Text>
          ) : null}
        </Card>
      ) : (
        <Card style={styles.card}>
          <EmptyState title="No workout yet today" subtitle="Tap Quick Start to begin one." icon="🏋️" />
        </Card>
      )}

      <SectionHeader title="Last Workout" />
      {lastWorkout ? (
        <Card
          style={styles.card}
          onTouchEnd={() => router.push(`/workout/${lastWorkout.id}`)}
        >
          <Text style={styles.workoutName}>{lastWorkout.name}</Text>
          <Text style={styles.workoutMeta}>{formatFriendlyDate(lastWorkout.date)}</Text>
          <Text style={styles.workoutMeta}>
            {lastWorkout.exerciseCount} exercises · {lastWorkout.setCount} sets ·{" "}
            {formatWeight(lastWorkout.totalVolume, settings.units)} volume
          </Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <EmptyState title="No workout history yet" icon="📋" />
        </Card>
      )}

      <SectionHeader
        title="Recent Personal Records"
        actionLabel="See all"
        onAction={() => router.push("/(tabs)/progress")}
      />
      {recentPRs.length > 0 ? (
        <Card style={styles.card}>
          {recentPRs.map((pr, index) => (
            <View
              key={pr.id}
              style={[styles.prRow, index < recentPRs.length - 1 && styles.prRowBorder]}
            >
              <Text style={styles.prExercise}>{pr.exerciseName}</Text>
              <Text style={styles.prValue}>
                {formatWeight(pr.weight, settings.units)} × {pr.reps}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.card}>
          <EmptyState title="No PRs yet" subtitle="Finish a workout to start setting records." icon="🏆" />
        </Card>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
