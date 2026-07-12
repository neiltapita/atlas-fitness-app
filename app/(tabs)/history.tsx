import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { getWorkoutSummaries } from "@/db/queries";
import { WorkoutSummary } from "@/types";
import { getMonthGrid, monthLabel, isToday } from "@/utils/dateHelpers";
import { formatWeight } from "@/utils/calculations";
import { useSettings } from "@/context/SettingsContext";

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HistoryScreen() {
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
  calendarCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthLabel: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  monthNav: {
    ...typography.title,
    color: colors.accent,
    paddingHorizontal: spacing.md,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.tiny,
    color: colors.textTertiary,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: colors.accent,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dayText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: "#1A0E06",
    fontWeight: "700",
  },
  dot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  workoutCard: {
    gap: spacing.xs,
  },
  workoutName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  workoutMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const summaries = await getWorkoutSummaries(db, 500);
    setWorkouts(summaries);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSummary[]>();
    for (const w of workouts) {
      const list = map.get(w.date) ?? [];
      list.push(w);
      map.set(w.date, list);
    }
    return map;
  }, [workouts]);

  const grid = useMemo(() => getMonthGrid(cursor.year, cursor.month), [cursor]);

  const visibleWorkouts = selectedDate
    ? workoutsByDate.get(selectedDate) ?? []
    : workouts.filter((w) => {
        const d = new Date(`${w.date}T00:00:00`);
        return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
      });

  const goToMonth = (delta: number) => {
    setSelectedDate(null);
    setCursor((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => goToMonth(-1)} hitSlop={10}>
            <Text style={styles.monthNav}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(cursor.year, cursor.month)}</Text>
          <Pressable onPress={() => goToMonth(1)} hitSlop={10}>
            <Text style={styles.monthNav}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_HEADERS.map((w, i) => (
            <Text key={i} style={styles.weekdayLabel}>
              {w}
            </Text>
          ))}
        </View>

        {grid.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((dateStr, di) => {
              const hasWorkout = dateStr ? workoutsByDate.has(dateStr) : false;
              const selected = dateStr === selectedDate;
              return (
                <Pressable
                  key={di}
                  disabled={!dateStr}
                  onPress={() => setSelectedDate(selected ? null : dateStr)}
                  style={styles.dayCell}
                >
                  {dateStr ? (
                    <View
                      style={[
                        styles.dayCircle,
                        selected && styles.dayCircleSelected,
                        !selected && isToday(dateStr) && styles.dayCircleToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {parseInt(dateStr.slice(-2), 10)}
                      </Text>
                      {hasWorkout ? <View style={styles.dot} /> : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <FlatList
        data={visibleWorkouts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No workouts" subtitle="Nothing logged for this period yet." icon="🗓️" />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/workout/${item.id}`)}>
            <Card style={styles.workoutCard}>
              <Text style={styles.workoutName}>{item.name}</Text>
              <Text style={styles.workoutMeta}>
                {item.exerciseCount} exercises · {item.setCount} sets ·{" "}
                {formatWeight(item.totalVolume, settings.units)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
