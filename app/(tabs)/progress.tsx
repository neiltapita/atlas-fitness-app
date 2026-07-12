import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { LineChartCard } from "@/components/LineChartCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import {
  getBestLiftPerExercise,
  getBestLiftByName,
  getExerciseHistory,
  getVolumeByWorkout,
  getBodyweightEntries,
  addBodyweightEntry,
} from "@/db/queries";
import { PersonalRecord, BodyweightEntry, ExerciseHistoryPoint } from "@/types";
import { formatWeight } from "@/utils/calculations";
import { shortDate } from "@/utils/dateHelpers";

const BIG_THREE = ["Bench Press", "Squat", "Deadlift"];

export default function ProgressScreen() {
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
  bigThreeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bigThreeCard: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  bigThreeLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  bigThreeValue: {
    ...typography.title,
    color: colors.accent,
  },
  bigThreeSub: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  chipRow: {
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
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
    color: "#1A0E06",
    fontWeight: "700",
  },
  liftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  liftRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  liftName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  liftValue: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const { settings } = useSettings();

  const [bestLifts, setBestLifts] = useState<PersonalRecord[]>([]);
  const [bigThree, setBigThree] = useState<Record<string, PersonalRecord | null>>({});
  const [volumeSeries, setVolumeSeries] = useState<{ date: string; volume: number }[]>([]);
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightEntry[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [bwModalVisible, setBwModalVisible] = useState(false);
  const [bwInput, setBwInput] = useState("");

  const loadData = useCallback(async () => {
    const [lifts, volumes, bw] = await Promise.all([
      getBestLiftPerExercise(db),
      getVolumeByWorkout(db, 12),
      getBodyweightEntries(db),
    ]);
    setBestLifts(lifts);
    setVolumeSeries(volumes);
    setBodyweightEntries(bw);

    const bigThreeResults: Record<string, PersonalRecord | null> = {};
    for (const name of BIG_THREE) {
      bigThreeResults[name] = await getBestLiftByName(db, name);
    }
    setBigThree(bigThreeResults);

    if (!selectedExercise && lifts.length > 0) {
      setSelectedExercise(lifts[0].exerciseName ?? null);
    }
  }, [db, selectedExercise]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    async function loadExerciseHistory() {
      if (!selectedExercise) {
        setExerciseHistory([]);
        return;
      }
      const record = bestLifts.find((l) => l.exerciseName === selectedExercise);
      if (!record) return;
      const history = await getExerciseHistory(db, record.exerciseId);
      setExerciseHistory(history);
    }
    loadExerciseHistory();
  }, [selectedExercise, bestLifts, db]);

  const submitBodyweight = useCallback(async () => {
    const value = parseFloat(bwInput);
    if (!value || value <= 0) return;
    await addBodyweightEntry(db, value);
    setBwInput("");
    setBwModalVisible(false);
    await loadData();
  }, [bwInput, db, loadData]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      <SectionHeader title="Best Lifts" />
      <View style={styles.bigThreeRow}>
        {BIG_THREE.map((name) => (
          <Card key={name} style={styles.bigThreeCard}>
            <Text style={styles.bigThreeLabel}>{name}</Text>
            <Text style={styles.bigThreeValue}>
              {bigThree[name] ? formatWeight(bigThree[name]!.weight, settings.units) : "—"}
            </Text>
            {bigThree[name] ? (
              <Text style={styles.bigThreeSub}>× {bigThree[name]!.reps} reps</Text>
            ) : (
              <Text style={styles.bigThreeSub}>Not logged</Text>
            )}
          </Card>
        ))}
      </View>

      <SectionHeader title="Exercise History" />
      {bestLifts.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {bestLifts.map((lift) => (
              <Pressable
                key={lift.exerciseId}
                onPress={() => setSelectedExercise(lift.exerciseName ?? null)}
                style={[
                  styles.chip,
                  selectedExercise === lift.exerciseName && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedExercise === lift.exerciseName && styles.chipTextActive,
                  ]}
                >
                  {lift.exerciseName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <LineChartCard
            title={`${selectedExercise ?? ""} · Weight Progression`}
            labels={exerciseHistory.map((h) => shortDate(h.date))}
            values={exerciseHistory.map((h) => h.maxWeight)}
            suffix={settings.units}
          />
        </>
      ) : (
        <Card>
          <EmptyState title="No exercise history yet" subtitle="Finish workouts to build this chart." icon="📊" />
        </Card>
      )}

      <SectionHeader title="Volume Progression" />
      <LineChartCard
        title="Total Volume Per Workout"
        labels={volumeSeries.map((v) => shortDate(v.date))}
        values={volumeSeries.map((v) => v.volume)}
        suffix={settings.units}
      />

      <SectionHeader
        title="Bodyweight"
        actionLabel="+ Log weight"
        onAction={() => setBwModalVisible(true)}
      />
      <LineChartCard
        title="Bodyweight Over Time"
        labels={bodyweightEntries.map((e) => shortDate(e.date))}
        values={bodyweightEntries.map((e) => e.weight)}
        suffix={settings.units}
      />

      <SectionHeader title="Best Lift by Exercise" />
      {bestLifts.length > 0 ? (
        <Card>
          {bestLifts.map((lift, index) => (
            <View
              key={lift.exerciseId}
              style={[styles.liftRow, index < bestLifts.length - 1 && styles.liftRowBorder]}
            >
              <Text style={styles.liftName}>{lift.exerciseName}</Text>
              <Text style={styles.liftValue}>
                {formatWeight(lift.weight, settings.units)} × {lift.reps}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState title="No records yet" icon="🏆" />
        </Card>
      )}

      <View style={{ height: spacing.xxl }} />

      <Modal visible={bwModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Bodyweight</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              placeholder={`Weight (${settings.units})`}
              placeholderTextColor={colors.textTertiary}
              value={bwInput}
              onChangeText={setBwInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <PrimaryButton
                title="Cancel"
                variant="secondary"
                size="medium"
                onPress={() => {
                  setBwModalVisible(false);
                  setBwInput("");
                }}
                style={styles.modalButton}
              />
              <PrimaryButton title="Save" size="medium" onPress={submitBodyweight} style={styles.modalButton} />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}
