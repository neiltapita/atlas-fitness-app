import React, { useState, useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { ACCENT_PRESETS, radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { exportWorkoutData, pickAndImportWorkoutData } from "@/utils/exportImport";
import { haptics } from "@/utils/haptics";

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
}),
    [colors]
  );
  const db = useSQLiteContext();
  const { settings, setUnits, setTheme, setAccentColor } = useSettings();
  const [busy, setBusy] = useState(false);

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
        <Text style={styles.aboutTitle}>Gym Tracker</Text>
        <Text style={styles.aboutText}>
          A personal, fully offline workout tracker. All data is stored locally on
          this device in SQLite — nothing is ever sent to a server.
        </Text>
        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
      </Card>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
