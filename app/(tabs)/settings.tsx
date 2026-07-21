import React, { useEffect, useState, useMemo } from "react";
import { ActionSheetIOS, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { ACCENT_PRESETS, radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { WaterUnit } from "@/types";
import { getTabConfig, normalizeTabOrder } from "@/constants/tabs";
import { getGeminiKey, setGeminiKey } from "@/utils/apiKeyStore";
import { exportWorkoutData, pickAndImportWorkoutData } from "@/utils/exportImport";
import { haptics } from "@/utils/haptics";
import { mlToUnit, unitToMl } from "@/utils/water";

const WATER_UNITS: WaterUnit[] = ["mL", "L", "fl oz", "gal"];

export default function SettingsScreen() {
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
    gap: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  tabPairRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  tab: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  dataDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  aboutTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  aboutText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  aboutVersion: {
    ...typography.tiny,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: {
    borderColor: colors.textPrimary,
  },
  swatchCheck: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  goalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    width: 90,
    textAlign: "center",
  },
  computedCalorieValue: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
    width: 90,
    textAlign: "center",
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  inlineDropdownText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
  },
  inlineDropdownCaret: {
    ...typography.tiny,
    color: colors.accent,
  },
  apiKeyInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  apiKeyStatus: {
    ...typography.tiny,
    color: colors.success,
  },
  tabOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabOrderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tabOrderLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  tabOrderButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tabOrderButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOrderButtonDisabled: {
    opacity: 0.3,
  },
  tabOrderButtonText: {
    ...typography.headline,
    color: colors.accent,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const { settings, setUnits, setTheme, setAccentColor, setWaterUnit, setTabOrder, setSex, setNutritionGoals } =
    useSettings();
  const tabOrder = normalizeTabOrder(settings.tabOrder);

  const moveTab = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tabOrder.length) return;
    haptics.tap();
    const next = [...tabOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setTabOrder(next);
  };
  const [busy, setBusy] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    getGeminiKey().then((key) => setHasApiKey(!!key));
  }, []);

  const commitApiKey = async () => {
    await setGeminiKey(apiKeyInput);
    setHasApiKey(!!apiKeyInput.trim());
    setApiKeyInput("");
  };
  const [goals, setGoals] = useState({
    proteinGoalG: String(settings.proteinGoalG),
    carbGoalG: String(settings.carbGoalG),
    fatGoalG: String(settings.fatGoalG),
    waterGoal: String(mlToUnit(settings.waterGoalMl, settings.waterUnit)),
  });

  useEffect(() => {
    setGoals({
      proteinGoalG: String(settings.proteinGoalG),
      carbGoalG: String(settings.carbGoalG),
      fatGoalG: String(settings.fatGoalG),
      waterGoal: String(mlToUnit(settings.waterGoalMl, settings.waterUnit)),
    });
  }, [settings]);

  const handleWaterUnitPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...WATER_UNITS, "Cancel"], cancelButtonIndex: WATER_UNITS.length },
      (index) => {
        if (index < WATER_UNITS.length) {
          haptics.tap();
          setWaterUnit(WATER_UNITS[index]);
        }
      }
    );
  };

  // Daily calorie goal is derived from the macro goals (protein/carbs = 4
  // kcal/g, fat = 9 kcal/g) rather than entered separately, so they can
  // never disagree.
  const computedCalorieGoal =
    (parseInt(goals.proteinGoalG, 10) || 0) * 4 +
    (parseInt(goals.carbGoalG, 10) || 0) * 4 +
    (parseInt(goals.fatGoalG, 10) || 0) * 9;

  const commitGoals = () => {
    const waterGoalValue = parseFloat(goals.waterGoal);
    setNutritionGoals({
      dailyCalorieGoal: computedCalorieGoal,
      proteinGoalG: parseInt(goals.proteinGoalG, 10) || settings.proteinGoalG,
      carbGoalG: parseInt(goals.carbGoalG, 10) || settings.carbGoalG,
      fatGoalG: parseInt(goals.fatGoalG, 10) || settings.fatGoalG,
      waterGoalMl: waterGoalValue > 0 ? unitToMl(waterGoalValue, settings.waterUnit) : settings.waterGoalMl,
    });
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportWorkoutData(db);
    } catch (e) {
      Alert.alert("Export failed", "Something went wrong while exporting your data.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      "Import Data",
      "Importing will replace your current workout history with the contents of the selected file. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const result = await pickAndImportWorkoutData(db);
              Alert.alert(result.imported ? "Success" : "Import", result.message);
            } catch (e) {
              Alert.alert("Import failed", "Something went wrong while importing your data.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View>
        <SectionHeader title="Appearance" />
        <View style={styles.section}>
          <View style={styles.tabPairRow}>
            {(["dark", "light"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setTheme(mode)}
                style={[styles.tab, settings.theme === mode && styles.tabActive]}
              >
                <Text style={[styles.tabText, settings.theme === mode && styles.tabTextActive]}>
                  {mode === "dark" ? "Dark" : "Light"}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.swatchRow}>
            {ACCENT_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => {
                  haptics.tap();
                  setAccentColor(preset);
                }}
                style={[
                  styles.swatch,
                  { backgroundColor: preset },
                  settings.accentColor === preset && styles.swatchSelected,
                ]}
              >
                {settings.accentColor === preset ? <Text style={styles.swatchCheck}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Tab Order" />
        <View style={styles.section}>
          {tabOrder.map((key, index) => {
            const tab = getTabConfig(key);
            return (
              <View key={key} style={styles.tabOrderRow}>
                <View style={styles.tabOrderLabelRow}>
                  <Ionicons name={tab.icon} size={18} color={colors.textSecondary} />
                  <Text style={styles.tabOrderLabel}>{tab.title}</Text>
                </View>
                <View style={styles.tabOrderButtons}>
                  <Pressable
                    style={[styles.tabOrderButton, index === 0 && styles.tabOrderButtonDisabled]}
                    onPress={() => moveTab(index, -1)}
                    disabled={index === 0}
                    hitSlop={8}
                  >
                    <Text style={styles.tabOrderButtonText}>↑</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.tabOrderButton,
                      index === tabOrder.length - 1 && styles.tabOrderButtonDisabled,
                    ]}
                    onPress={() => moveTab(index, 1)}
                    disabled={index === tabOrder.length - 1}
                    hitSlop={8}
                  >
                    <Text style={styles.tabOrderButtonText}>↓</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeader title="Units" />
        <View style={styles.section}>
          <View style={styles.tabPairRow}>
            {(["lb", "kg"] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setUnits(unit)}
                style={[styles.tab, settings.units === unit && styles.tabActive]}
              >
                <Text style={[styles.tabText, settings.units === unit && styles.tabTextActive]}>
                  {unit.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Strength Standards" />
        <View style={styles.section}>
          <Text style={styles.dataDescription}>
            Used to personalize your Muscle Map strength estimates.
          </Text>
          <View style={styles.tabPairRow}>
            {(["male", "female"] as const).map((sex) => (
              <Pressable
                key={sex}
                onPress={() => setSex(sex)}
                style={[styles.tab, settings.sex === sex && styles.tabActive]}
              >
                <Text style={[styles.tabText, settings.sex === sex && styles.tabTextActive]}>
                  {sex === "male" ? "Male" : "Female"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Nutrition Goals" />
        <View style={styles.section}>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Protein (g)</Text>
            <TextInput
              style={styles.goalInput}
              keyboardType="number-pad"
              value={goals.proteinGoalG}
              onChangeText={(t) => setGoals((g) => ({ ...g, proteinGoalG: t }))}
              onEndEditing={commitGoals}
            />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Carbs (g)</Text>
            <TextInput
              style={styles.goalInput}
              keyboardType="number-pad"
              value={goals.carbGoalG}
              onChangeText={(t) => setGoals((g) => ({ ...g, carbGoalG: t }))}
              onEndEditing={commitGoals}
            />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Fat (g)</Text>
            <TextInput
              style={styles.goalInput}
              keyboardType="number-pad"
              value={goals.fatGoalG}
              onChangeText={(t) => setGoals((g) => ({ ...g, fatGoalG: t }))}
              onEndEditing={commitGoals}
            />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Daily Calories (auto)</Text>
            <Text style={styles.computedCalorieValue}>{computedCalorieGoal}</Text>
          </View>
          <View style={styles.goalRow}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalLabel}>Water Goal (</Text>
              <Pressable style={styles.inlineDropdown} onPress={handleWaterUnitPress} hitSlop={8}>
                <Text style={styles.inlineDropdownText}>{settings.waterUnit}</Text>
                <Text style={styles.inlineDropdownCaret}>▾</Text>
              </Pressable>
              <Text style={styles.goalLabel}>)</Text>
            </View>
            <TextInput
              style={styles.goalInput}
              keyboardType="decimal-pad"
              value={goals.waterGoal}
              onChangeText={(t) => setGoals((g) => ({ ...g, waterGoal: t }))}
              onEndEditing={commitGoals}
            />
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="AI Photo Logging" />
        <View style={styles.section}>
          <Text style={styles.dataDescription}>
            Add a free Gemini (Google AI) API key to enable "Take Photo" on the
            Nutrition tab, which estimates a meal's foods and macros from a
            picture. This is the only feature in the app that uses the internet
            or a third party — everything else stays fully offline. Get a free
            key at aistudio.google.com/apikey.
          </Text>
          <TextInput
            style={styles.apiKeyInput}
            placeholder={hasApiKey ? "Key saved — enter a new one to replace it" : "AIza..."}
            placeholderTextColor={colors.textTertiary}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            onEndEditing={commitApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {hasApiKey ? <Text style={styles.apiKeyStatus}>✓ API key saved</Text> : null}
        </View>
      </View>

      <View>
        <SectionHeader title="Data" />
        <View style={styles.section}>
          <Text style={styles.dataDescription}>
            Export all of your workouts, exercises, and personal records to a JSON
            file, or restore from a previous export.
          </Text>
          <PrimaryButton title="Export Data" variant="secondary" onPress={handleExport} loading={busy} />
          <PrimaryButton title="Import Data" variant="secondary" onPress={handleImport} loading={busy} />
        </View>
      </View>

      <View>
        <SectionHeader title="About" />
        <View style={styles.section}>
          <Text style={styles.aboutTitle}>Atlas</Text>
          <Text style={styles.aboutText}>
            A personal fitness platform. All data is stored locally on this device
            in SQLite. Nothing is sent anywhere unless you use AI photo logging,
            which sends just that one photo to Gemini to estimate macros.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
