import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { deleteMeal, getMealDetail, getMeals } from "@/db/nutritionQueries";
import { Meal } from "@/types";
import { haptics } from "@/utils/haptics";

interface MealRow extends Meal {
  summary: string;
}

export default function MealsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  newButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xs,
  },
  name: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const [meals, setMeals] = useState<MealRow[]>([]);

  const load = useCallback(async () => {
    const list = await getMeals(db);
    const rows: MealRow[] = [];
    for (const m of list) {
      const detail = await getMealDetail(db, m.id);
      const names = detail?.items.map((i) => i.foodName).filter(Boolean) ?? [];
      rows.push({
        ...m,
        summary:
          names.length > 0
            ? `${Math.round(detail?.totals.calories ?? 0)} kcal · ${names.join(", ")}`
            : "No foods yet",
      });
    }
    setMeals(rows);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (meal: MealRow) => {
    Alert.alert("Delete Meal", `Delete "${meal.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          haptics.warning();
          await deleteMeal(db, meal.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PrimaryButton
        title="+ New Meal"
        onPress={() => router.push("/nutrition/meals/create")}
        style={styles.newButton}
      />

      <FlatList
        data={meals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No meals yet"
            subtitle="Save a combo of foods (like a protein shake or lunch bowl) to log it in one tap."
            icon="🥗"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/nutrition/meals/[id]", params: { id: String(item.id) } })}
            onLongPress={() => handleDelete(item)}
          >
            <Card style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
