import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { LineChartCard } from "@/components/LineChartCard";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import {
  addWater,
  deleteNutritionEntry,
  getDailySummary,
  getDailyTotalsRange,
} from "@/db/nutritionQueries";
import { DailyNutritionSummary, MacroTotalsByDate, MealType, NutritionEntry } from "@/types";
import { addDaysToDateString, formatFriendlyDate, formatTime, shortDate, todayDateString } from "@/utils/dateHelpers";
import { haptics } from "@/utils/haptics";

const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drinks",
};

export default function NutritionScreen() {
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
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  dateArrowText: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  dateLabel: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.md,
  },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  calorieValue: {
    ...typography.largeTitle,
    color: colors.accent,
  },
  calorieLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  remainingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "right",
  },
  macroRow: {
    gap: spacing.xs,
  },
  macroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  macroValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  barTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: radii.pill,
  },
  waterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waterText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  waterSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  waterButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  waterButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  waterButtonText: {
    ...typography.headline,
    color: colors.accent,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  entryMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  entryCalories: {
    ...typography.body,
    color: colors.textSecondary,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();

  const [date, setDate] = useState(todayDateString());
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [weekly, setWeekly] = useState<MacroTotalsByDate[]>([]);

  const load = useCallback(async () => {
    setSummary(await getDailySummary(db, date));
    const start = addDaysToDateString(todayDateString(), -6);
    setWeekly(await getDailyTotalsRange(db, start, todayDateString()));
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDeleteEntry = (entry: NutritionEntry) => {
    Alert.alert("Remove Entry", `Remove ${entry.label} from this day?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          haptics.warning();
          await deleteNutritionEntry(db, entry.id);
          load();
        },
      },
    ]);
  };

  const handleWater = async (deltaMl: number) => {
    haptics.tap();
    await addWater(db, date, deltaMl);
    load();
  };

  const formatWater = (ml: number) => {
    switch (settings.waterUnit) {
      case "mL":
        return `${Math.round(ml)} mL`;
      case "fl oz":
        return `${(ml / 29.5735).toFixed(1)} fl oz`;
      case "gal":
        return `${(ml / 3785.41).toFixed(2)} gal`;
      default:
        return `${(ml / 1000).toFixed(1)} L`;
    }
  };

  if (!summary) return null;

  const remaining = settings.dailyCalorieGoal - summary.calories;
  const entriesByMeal = MEAL_TYPE_ORDER.map((type) => ({
    type,
    entries: summary.entries.filter((e) => e.mealType === type),
  })).filter((g) => g.entries.length > 0);

  const weekLabels = weekly.map((w) => shortDate(w.date));
  const weekValues = weekly.map((w) => w.calories);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <View style={styles.dateNav}>
          <Pressable style={styles.dateArrow} onPress={() => setDate((d) => addDaysToDateString(d, -1))} hitSlop={8}>
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.dateLabel}>{formatFriendlyDate(date)}</Text>
          <Pressable style={styles.dateArrow} onPress={() => setDate((d) => addDaysToDateString(d, 1))} hitSlop={8}>
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={entriesByMeal}
        keyExtractor={(g) => g.type}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <Card style={styles.summaryCard}>
              <View style={styles.calorieRow}>
                <View>
                  <Text style={styles.calorieValue}>{Math.round(summary.calories)}</Text>
                  <Text style={styles.calorieLabel}>of {settings.dailyCalorieGoal} kcal</Text>
                </View>
                <Text style={styles.remainingText}>
                  {remaining >= 0 ? `${Math.round(remaining)} left` : `${Math.round(-remaining)} over`}
                </Text>
              </View>

              <MacroBar
                name="Protein"
                value={summary.protein}
                goal={settings.proteinGoalG}
                color={colors.accent}
                trackColor={colors.surfaceElevated}
                styles={styles}
              />
              <MacroBar
                name="Carbs"
                value={summary.carbs}
                goal={settings.carbGoalG}
                color={colors.success}
                trackColor={colors.surfaceElevated}
                styles={styles}
              />
              <MacroBar
                name="Fat"
                value={summary.fat}
                goal={settings.fatGoalG}
                color={colors.warning}
                trackColor={colors.surfaceElevated}
                styles={styles}
              />
            </Card>

            <Card style={styles.waterCard}>
              <View>
                <Text style={styles.waterText}>{formatWater(summary.waterMl)}</Text>
                <Text style={styles.waterSub}>of {formatWater(settings.waterGoalMl)}</Text>
              </View>
              <View style={styles.waterButtons}>
                <Pressable style={styles.waterButton} onPress={() => handleWater(-250)} hitSlop={8}>
                  <Text style={styles.waterButtonText}>−</Text>
                </Pressable>
                <Pressable style={styles.waterButton} onPress={() => handleWater(250)} hitSlop={8}>
                  <Text style={styles.waterButtonText}>+</Text>
                </Pressable>
              </View>
            </Card>

            <View style={styles.actionsRow}>
              <PrimaryButton
                title="+ Log Food"
                onPress={() => router.push({ pathname: "/nutrition/log", params: { date } })}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="My Meals"
                variant="secondary"
                onPress={() => router.push("/nutrition/meals")}
                style={styles.actionButton}
              />
            </View>

            <SectionHeader title="Today's Log" />
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="Nothing logged yet" subtitle="Tap + Log Food to add your first item." icon="🍽️" />
        }
        renderItem={({ item }) => (
          <View>
            <Text style={styles.macroName}>{MEAL_TYPE_LABELS[item.type]}</Text>
            {item.entries.map((entry) => (
              <Pressable key={entry.id} onLongPress={() => handleDeleteEntry(entry)} style={styles.entryRow}>
                <View>
                  <Text style={styles.entryLabel}>{entry.label}</Text>
                  <Text style={styles.entryMeta}>{formatTime(entry.loggedAt)}</Text>
                </View>
                <Text style={styles.entryCalories}>{Math.round(entry.calories)} kcal</Text>
              </Pressable>
            ))}
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.md }}>
            <LineChartCard
              title="Calories (Last 7 Days)"
              labels={weekLabels}
              values={weekValues}
              emptyMessage="Log meals for a few days to see this chart."
            />
          </View>
        }
      />
    </View>
  );
}

function MacroBar({
  name,
  value,
  goal,
  color,
  trackColor,
  styles,
}: {
  name: string;
  value: number;
  goal: number;
  color: string;
  trackColor: string;
  styles: { macroRow: object; macroHeaderRow: object; macroName: object; macroValue: object; barTrack: object; barFill: object };
}) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeaderRow}>
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroValue}>
          {Math.round(value)}g / {goal}g
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}
