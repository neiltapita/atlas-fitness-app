import React, { useEffect, useState, useMemo } from "react";
import { ActionSheetIOS, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { ACCENT_PRESETS, radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { WaterUnit } from "@/types";
import { getTabConfig, normalizeTabOrder } from "@/constants/tabs";
import { getClaudeKey, setClaudeKey } from "@/utils/apiKeyStore";
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
    gap: spacing.md,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  unitButton: {
    flex: 1,
  },
  dataCard: {
    gap: spacing.md,
  },
  dataDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  aboutCard: {
    gap: spacing.xs,
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
  goalsCard: {
    gap: spacing.md,
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
  apiKeyCard: {
    gap: spacing.sm,
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
  tabOrderCard: {
    gap: spacing.xs,
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
  const { settings, setUnits, setTheme, setAccentColor, setWaterUnit, setTabOrder, setNutritionGoals } =
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
    getClaudeKey().then((key) => setHasApiKey(!!key));
  }, []);

  const commitApiKey = async () => {
    await setClaudeKey(apiKeyInput);
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

      <SectionHeader title="Appearance" />
      <Card style={styles.row}>
        {(["dark", "light"] as const).map((mode) => (
          <PrimaryButton
            key={mode}
            title={mode === "dark" ? "Dark" : "Light"}
            variant={settings.theme === mode ? "primary" : "secondary"}
            size="medium"
            onPress={() => setTheme(mode)}
            style={styles.unitButton}
          />
        ))}
      </Card>
      <Card style={styles.swatchRow}>
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
      </Card>

      <SectionHeader title="Tab Order" />
      <Card style={styles.tabOrderCard}>
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
      </Card>

      <SectionHeader title="Units" />
      <Card style={styles.row}>
        {(["lb", "kg"] as const).map((unit) => (
          <PrimaryButton
            key={unit}
            title={unit.toUpperCase()}
            variant={settings.units === unit ? "primary" : "secondary"}
            size="medium"
            onPress={() => setUnits(unit)}
            style={styles.unitButton}
          />
        ))}
      </Card>

      <SectionHeader title="Nutrition Goals" />
      <Card style={styles.goalsCard}>
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
      </Card>

      <SectionHeader title="AI Photo Logging" />
      <Card style={styles.apiKeyCard}>
        <Text style={styles.dataDescription}>
          Add a Claude (Anthropic) API key to enable "Take Photo" on the Nutrition
          tab, which estimates a meal's foods and macros from a picture. This is
          the only feature in the app that uses the internet or a third party —
          everything else stays fully offline.
        </Text>
        <TextInput
          style={styles.apiKeyInput}
          placeholder={hasApiKey ? "Key saved — enter a new one to replace it" : "sk-ant-..."}
          placeholderTextColor={colors.textTertiary}
          value={apiKeyInput}
          onChangeText={setApiKeyInput}
          onEndEditing={commitApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {hasApiKey ? <Text style={styles.apiKeyStatus}>✓ API key saved</Text> : null}
      </Card>

      <SectionHeader title="Data" />
      <Card style={styles.dataCard}>
        <Text style={styles.dataDescription}>
          Export all of your workouts, exercises, and personal records to a JSON
          file, or restore from a previous export.
        </Text>
        <PrimaryButton title="Export Data" variant="secondary" onPress={handleExport} loading={busy} />
        <PrimaryButton title="Import Data" variant="secondary" onPress={handleImport} loading={busy} />
      </Card>

      <SectionHeader title="About" />
      <Card style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>Atlas</Text>
        <Text style={styles.aboutText}>
          A personal fitness platform. All data is stored locally on this device
          in SQLite. Nothing is sent anywhere unless you use AI photo logging,
          which sends just that one photo to Claude to estimate macros.
        </Text>
        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
      </Card>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
