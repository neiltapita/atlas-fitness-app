import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { addFoodToMeal, createCustomFood, logFood, searchFoods, toggleFavoriteFood } from "@/db/nutritionQueries";
import { Food, MealType } from "@/types";
import { haptics } from "@/utils/haptics";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
};

export default function LogFoodScreen() {
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
  createLink: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  foodName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  foodMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  favoriteStar: {
    fontSize: 20,
    color: colors.textTertiary,
  },
  favoriteStarActive: {
    color: colors.accent,
  },
  logPanel: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  logPanelTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    textAlign: "center",
  },
  quantityLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.accentText,
    fontWeight: "700",
  },
  macroPreview: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  createForm: {
    margin: spacing.lg,
    marginTop: 0,
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
  createRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  createInputHalf: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  computedCalories: {
    justifyContent: "center",
  },
  computedCaloriesText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
  },
  createLabel: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  createButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  createButton: {
    flex: 1,
  },
}),
    [colors]
  );
  const { date, mealId } = useLocalSearchParams<{ date?: string; mealId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [mealType, setMealType] = useState<MealType>("snack");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brandName: "",
    servingSize: "100",
    servingUnit: "g",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
  });
  // Calories are derived from macros (protein/carbs = 4 kcal/g, fat = 9 kcal/g)
  // rather than entered separately, so the two can never disagree.
  const computedCalories =
    (parseFloat(form.protein) || 0) * 4 + (parseFloat(form.carbs) || 0) * 4 + (parseFloat(form.fat) || 0) * 9;

  const load = useCallback(async () => {
    setFoods(await searchFoods(db, query));
  }, [db, query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleFavorite = async (foodId: number) => {
    await toggleFavoriteFood(db, foodId);
    load();
  };

  const handleLog = async () => {
    if (!selected) return;
    const qty = parseFloat(quantity) || 1;
    haptics.success();
    if (mealId) {
      await addFoodToMeal(db, parseInt(mealId, 10), selected.id, qty);
    } else if (date) {
      await logFood(db, date, mealType, selected.id, qty);
    }
    router.back();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const id = await createCustomFood(db, {
      name: form.name.trim(),
      brandName: form.brandName.trim() || undefined,
      servingSize: parseFloat(form.servingSize) || 100,
      servingUnit: form.servingUnit.trim() || "g",
      calories: computedCalories,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
      fiber: parseFloat(form.fiber) || 0,
      sugar: parseFloat(form.sugar) || 0,
      sodium: parseFloat(form.sodium) || 0,
    });
    setShowCreate(false);
    load();
    const created = await searchFoods(db, form.name.trim());
    const match = created.find((f) => f.id === id);
    if (match) setSelected(match);
  };

  const qtyNum = parseFloat(quantity) || 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TextInput
        style={styles.searchInput}
        placeholder="Search foods..."
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
      />

      {showCreate ? (
        <ScrollView style={styles.createForm}>
          <Text style={styles.createLabel}>Name</Text>
          <TextInput
            style={styles.createInput}
            placeholder="Food name"
            placeholderTextColor={colors.textTertiary}
            value={form.name}
            onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
            autoFocus
          />
          <Text style={styles.createLabel}>Brand (optional)</Text>
          <TextInput
            style={styles.createInput}
            placeholder="Brand"
            placeholderTextColor={colors.textTertiary}
            value={form.brandName}
            onChangeText={(t) => setForm((f) => ({ ...f, brandName: t }))}
          />
          <View style={styles.createRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Serving Size</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.servingSize}
                onChangeText={(t) => setForm((f) => ({ ...f, servingSize: t }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Unit</Text>
              <TextInput
                style={styles.createInputHalf}
                value={form.servingUnit}
                onChangeText={(t) => setForm((f) => ({ ...f, servingUnit: t }))}
              />
            </View>
          </View>
          <View style={styles.createRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Protein (g)</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.protein}
                onChangeText={(t) => setForm((f) => ({ ...f, protein: t }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.carbs}
                onChangeText={(t) => setForm((f) => ({ ...f, carbs: t }))}
              />
            </View>
          </View>
          <View style={styles.createRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Fat (g)</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.fat}
                onChangeText={(t) => setForm((f) => ({ ...f, fat: t }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Calories (auto)</Text>
              <View style={[styles.createInputHalf, styles.computedCalories]}>
                <Text style={styles.computedCaloriesText}>{Math.round(computedCalories)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.createRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Fiber (g)</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.fiber}
                onChangeText={(t) => setForm((f) => ({ ...f, fiber: t }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.createLabel}>Sugar (g)</Text>
              <TextInput
                style={styles.createInputHalf}
                keyboardType="decimal-pad"
                value={form.sugar}
                onChangeText={(t) => setForm((f) => ({ ...f, sugar: t }))}
              />
            </View>
          </View>
          <Text style={styles.createLabel}>Sodium (mg)</Text>
          <TextInput
            style={styles.createInputHalf}
            keyboardType="decimal-pad"
            value={form.sodium}
            onChangeText={(t) => setForm((f) => ({ ...f, sodium: t }))}
          />
          <View style={styles.createButtons}>
            <PrimaryButton
              title="Cancel"
              variant="secondary"
              size="medium"
              onPress={() => setShowCreate(false)}
              style={styles.createButton}
            />
            <PrimaryButton title="Create" size="medium" onPress={handleCreate} style={styles.createButton} />
          </View>
        </ScrollView>
      ) : (
        <PrimaryButton
          title="+ Create Custom Food"
          variant="ghost"
          onPress={() => {
            setForm((f) => ({ ...f, name: query }));
            setShowCreate(true);
          }}
          style={styles.createLink}
        />
      )}

      <FlatList
        data={foods}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState title="No foods found" icon="🔍" />}
        renderItem={({ item }) => (
          <Pressable style={styles.foodRow} onPress={() => setSelected(item)}>
            <View>
              <Text style={styles.foodName}>
                {item.name}
                {item.brandName ? ` (${item.brandName})` : ""}
              </Text>
              <Text style={styles.foodMeta}>
                {Math.round(item.calories)} kcal · {item.servingSize}
                {item.servingUnit}
              </Text>
            </View>
            <Pressable onPress={() => handleToggleFavorite(item.id)} hitSlop={10}>
              <Text style={[styles.favoriteStar, item.isFavorite && styles.favoriteStarActive]}>
                {item.isFavorite ? "★" : "☆"}
              </Text>
            </Pressable>
          </Pressable>
        )}
      />

      {selected ? (
        <View style={styles.logPanel}>
          <Text style={styles.logPanelTitle}>{selected.name}</Text>
          <View style={styles.row}>
            <Text style={styles.quantityLabel}>Servings</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
            <Text style={styles.quantityLabel}>
              × {selected.servingSize}
              {selected.servingUnit}
            </Text>
          </View>
          <Text style={styles.macroPreview}>
            {Math.round(selected.calories * qtyNum)} kcal · P {Math.round(selected.protein * qtyNum)}g · C{" "}
            {Math.round(selected.carbs * qtyNum)}g · F {Math.round(selected.fat * qtyNum)}g
          </Text>
          {mealId ? null : (
            <View style={styles.chipRow}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt}
                  onPress={() => setMealType(mt)}
                  style={[styles.chip, mealType === mt && styles.chipActive]}
                >
                  <Text style={[styles.chipText, mealType === mt && styles.chipTextActive]}>
                    {MEAL_TYPE_LABELS[mt]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.createButtons}>
            <PrimaryButton
              title="Cancel"
              variant="secondary"
              size="medium"
              onPress={() => setSelected(null)}
              style={styles.createButton}
            />
            <PrimaryButton title="Log It" size="medium" onPress={handleLog} style={styles.createButton} />
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
