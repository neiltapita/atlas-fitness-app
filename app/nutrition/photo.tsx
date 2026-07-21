import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { createCustomFood, logFood } from "@/db/nutritionQueries";
import { MealType } from "@/types";
import { AIFoodItem, AIVisionError, identifyFoodPhoto } from "@/utils/aiVision";
import { getGeminiKey } from "@/utils/apiKeyStore";
import { haptics } from "@/utils/haptics";
import { resizeForVisionApi } from "@/utils/imageResize";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
};

interface EditableItem extends AIFoodItem {
  proteinText: string;
  carbsText: string;
  fatText: string;
  include: boolean;
}

function toEditable(item: AIFoodItem): EditableItem {
  return {
    ...item,
    proteinText: String(Math.round(item.protein)),
    carbsText: String(Math.round(item.carbs)),
    fatText: String(Math.round(item.fat)),
    include: true,
  };
}

export default function PhotoLogScreen() {
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
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  startButtons: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  loadingRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    ...typography.headline,
    color: colors.textPrimary,
    flex: 1,
  },
  itemMeta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  removeText: {
    ...typography.tiny,
    color: colors.danger,
  },
  macroRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  macroField: {
    flex: 1,
    gap: spacing.xs,
  },
  macroLabel: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  macroInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
    textAlign: "center",
  },
  computedCalories: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
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
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
}),
    [colors]
  );
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [saving, setSaving] = useState(false);

  const analyze = async (base64: string, uri: string) => {
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      Alert.alert(
        "No Gemini API key",
        "Add a Gemini API key in Settings → AI Photo Logging to use this feature."
      );
      return;
    }
    setImageUri(uri);
    setLoading(true);
    setItems([]);
    try {
      const results = await identifyFoodPhoto(base64, apiKey);
      setItems(results.map(toEditable));
    } catch (e) {
      const message = e instanceof AIVisionError ? e.message : "Something went wrong analyzing that photo.";
      Alert.alert("Couldn't analyze photo", message);
      setImageUri(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings to take a photo of your meal.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      const resized = await resizeForVisionApi(asset.uri, asset.width, asset.height, asset.base64);
      await analyze(resized, asset.uri);
    }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Enable photo library access in Settings to choose a photo of your meal.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const resized = await resizeForVisionApi(asset.uri, asset.width, asset.height, asset.base64);
      await analyze(resized, asset.uri);
    }
  };

  const updateItem = (index: number, fields: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...fields } : it)));
  };

  const removeItem = (index: number) => {
    haptics.warning();
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    const included = items.filter((it) => it.include);
    if (included.length === 0) return;
    setSaving(true);
    haptics.success();
    try {
      for (const item of included) {
        const protein = parseFloat(item.proteinText) || 0;
        const carbs = parseFloat(item.carbsText) || 0;
        const fat = parseFloat(item.fatText) || 0;
        const calories = protein * 4 + carbs * 4 + fat * 9;
        const foodId = await createCustomFood(db, {
          name: item.name,
          servingSize: 1,
          servingUnit: item.quantityDescription || "serving",
          calories,
          protein,
          carbs,
          fat,
          fiber: item.fiber,
          sugar: item.sugar,
          sodium: item.sodium,
        });
        await logFood(db, date, mealType, foodId, 1);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!imageUri ? (
          <>
            <Text style={styles.intro}>
              Take or choose a photo of your meal — Gemini will estimate the foods and macros for you to review
              before anything is saved.
            </Text>
            <View style={styles.startButtons}>
              <PrimaryButton title="📷 Take Photo" onPress={handleTakePhoto} />
              <PrimaryButton title="Choose from Library" variant="secondary" onPress={handlePickPhoto} />
            </View>
          </>
        ) : (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        )}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Analyzing photo...</Text>
          </View>
        ) : null}

        {items.map((item, index) => {
          const calories = (parseFloat(item.proteinText) || 0) * 4 + (parseFloat(item.carbsText) || 0) * 4 + (parseFloat(item.fatText) || 0) * 9;
          return (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.quantityDescription ? <Text style={styles.itemMeta}>{item.quantityDescription}</Text> : null}
                </View>
                <Pressable onPress={() => removeItem(index)} hitSlop={10}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    keyboardType="decimal-pad"
                    value={item.proteinText}
                    onChangeText={(t) => updateItem(index, { proteinText: t })}
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    keyboardType="decimal-pad"
                    value={item.carbsText}
                    onChangeText={(t) => updateItem(index, { carbsText: t })}
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    keyboardType="decimal-pad"
                    value={item.fatText}
                    onChangeText={(t) => updateItem(index, { fatText: t })}
                  />
                </View>
              </View>
              <Text style={styles.computedCalories}>{Math.round(calories)} kcal (auto)</Text>
            </View>
          );
        })}

        {items.length > 0 ? (
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
        ) : null}

        {items.length > 0 ? (
          <View style={styles.footer}>
            <PrimaryButton
              title="Retake"
              variant="secondary"
              onPress={() => {
                setImageUri(null);
                setItems([]);
              }}
              style={styles.footerButton}
            />
            <PrimaryButton
              title="Confirm & Log"
              onPress={handleConfirm}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
