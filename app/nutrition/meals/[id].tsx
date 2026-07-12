import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import {
  getMealDetail,
  removeMealItem,
  renameMeal,
  updateMealItemQuantity,
} from "@/db/nutritionQueries";
import { MealDetail } from "@/types";
import { haptics } from "@/utils/haptics";

export default function MealDetailScreen() {
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
  totalsText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  itemName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  itemMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    ...typography.headline,
    color: colors.accent,
  },
  quantityValue: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 56,
    textAlign: "center",
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
  const mealId = parseInt(id, 10);
  const db = useSQLiteContext();
  const router = useRouter();

  const [detail, setDetail] = useState<MealDetail | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const load = useCallback(async () => {
    const d = await getMealDetail(db, mealId);
    setDetail(d);
    if (d) setNameDraft(d.name);
  }, [db, mealId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const commitName = async () => {
    const finalName = nameDraft.trim() || "Meal";
    await renameMeal(db, mealId, finalName);
    load();
  };

  const handleRemoveItem = (mealItemId: number, foodName: string) => {
    Alert.alert("Remove Food", `Remove ${foodName} from this meal?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          haptics.warning();
          await removeMealItem(db, mealItemId);
          load();
        },
      },
    ]);
  };

  const handleQuantityChange = async (mealItemId: number, quantity: number, delta: number) => {
    const next = Math.max(0.5, Math.round((quantity + delta) * 2) / 2);
    haptics.tap();
    await updateMealItemQuantity(db, mealItemId, next);
    load();
  };

  if (!detail) return null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.nameInput}
        value={nameDraft}
        onChangeText={setNameDraft}
        onEndEditing={commitName}
        placeholder="Meal name"
        placeholderTextColor={colors.textTertiary}
      />
      <Text style={styles.totalsText}>
        {Math.round(detail.totals.calories)} kcal · P {Math.round(detail.totals.protein)}g · C{" "}
        {Math.round(detail.totals.carbs)}g · F {Math.round(detail.totals.fat)}g
      </Text>

      <FlatList
        data={detail.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No foods yet" subtitle="Add the foods that make up this meal." icon="🥗" />
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 0 }}>
            <Pressable style={styles.itemRow} onLongPress={() => handleRemoveItem(item.id, item.foodName ?? "food")}>
              <View>
                <Text style={styles.itemName}>{item.foodName}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {item.servingSize}
                  {item.servingUnit}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => handleQuantityChange(item.id, item.quantity, -0.5)}
                  style={styles.stepperButton}
                  hitSlop={8}
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{item.quantity} serv.</Text>
                <Pressable
                  onPress={() => handleQuantityChange(item.id, item.quantity, 0.5)}
                  style={styles.stepperButton}
                  hitSlop={8}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </Pressable>
          </Card>
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="+ Add Food"
          variant="secondary"
          onPress={() => router.push({ pathname: "/nutrition/log", params: { mealId: String(mealId) } })}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}
