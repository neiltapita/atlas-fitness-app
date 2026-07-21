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
import { StatTile } from "@/components/StatTile";
import { LineChartCard } from "@/components/LineChartCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { MuscleMap, RegionDetail } from "@/components/MuscleMap";
import { radii, spacing, typography } from "@/constants/theme";
import { BodyRegion, GRADABLE_REGIONS, REGION_EXERCISE, STANDARDS, getStrengthTier } from "@/constants/strengthStandards";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import {
  getBestLiftPerExercise,
  getBestLiftByName,
  getExerciseHistory,
  getVolumeByWorkout,
  getBodyweightEntries,
  getLatestBodyweight,
  addBodyweightEntry,
} from "@/db/queries";
import { PersonalRecord, BodyweightEntry, ExerciseHistoryPoint } from "@/types";
import { formatWeight } from "@/utils/calculations";
import { shortDate } from "@/utils/dateHelpers";

const BIG_THREE = ["Bench Press", "Squat", "Deadlift"];

const EMPTY_REGION_DETAILS: Record<BodyRegion, RegionDetail> = {
  chest: { tier: null, weight: null },
  shoulders: { tier: null, weight: null },
  biceps: { tier: null, weight: null },
  triceps: { tier: null, weight: null },
  back: { tier: null, weight: null },
  glutes: { tier: null, weight: null },
  quads: { tier: null, weight: null },
  hamstrings: { tier: null, weight: null },
  calves: { tier: null, weight: null },
  abs: { tier: null, weight: null },
};

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
    gap: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  bigThreeRow: {
    flexDirection: "row",
  },
  tabRow: {
    marginBottom: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    marginRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  liftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  liftRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  const [latestBodyweight, setLatestBodyweight] = useState<BodyweightEntry | null>(null);
  const [regionDetails, setRegionDetails] = useState<Record<BodyRegion, RegionDetail>>(EMPTY_REGION_DETAILS);

  const loadData = useCallback(async () => {
    const [lifts, volumes, bw, latestBw] = await Promise.all([
      getBestLiftPerExercise(db),
      getVolumeByWorkout(db, 12),
      getBodyweightEntries(db),
      getLatestBodyweight(db),
    ]);
    setBestLifts(lifts);
    setVolumeSeries(volumes);
    setBodyweightEntries(bw);
    setLatestBodyweight(latestBw);

    const bigThreeResults: Record<string, PersonalRecord | null> = {};
    for (const name of BIG_THREE) {
      bigThreeResults[name] = await getBestLiftByName(db, name);
    }
    setBigThree(bigThreeResults);

    const regionResults = await Promise.all(
      GRADABLE_REGIONS.map((region) => getBestLiftByName(db, REGION_EXERCISE[region]))
    );
    const nextDetails: Record<BodyRegion, RegionDetail> = { ...EMPTY_REGION_DETAILS };
    GRADABLE_REGIONS.forEach((region, index) => {
      const best = regionResults[index];
      if (!best) {
        nextDetails[region] = { tier: null, weight: null };
        return;
      }
      const tier = latestBw
        ? getStrengthTier(best.weight / latestBw.weight, STANDARDS[region][settings.sex])
        : null;
      nextDetails[region] = { tier, weight: best.weight };
    });
    setRegionDetails(nextDetails);

    if (!selectedExercise && lifts.length > 0) {
      setSelectedExercise(lifts[0].exerciseName ?? null);
    }
  }, [db, selectedExercise, settings.sex]);

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

      <View>
        <SectionHeader title="Best Lifts" />
        <View style={styles.bigThreeRow}>
          {BIG_THREE.map((name, index) => (
            <StatTile
              key={name}
              label={name}
              value={bigThree[name] ? formatWeight(bigThree[name]!.weight, settings.units) : "—"}
              sub={bigThree[name] ? `× ${bigThree[name]!.reps} reps` : "Not logged"}
              dividerLeft={index > 0}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionHeader
          title="Muscle Map"
          actionLabel={latestBodyweight ? undefined : "+ Log weight"}
          onAction={latestBodyweight ? undefined : () => setBwModalVisible(true)}
        />
        <MuscleMap
          details={regionDetails}
          units={settings.units}
          hasBodyweight={!!latestBodyweight}
        />
      </View>

      <View>
        <SectionHeader title="Exercise History" />
        {bestLifts.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
              {bestLifts.map((lift) => (
                <Pressable
                  key={lift.exerciseId}
                  onPress={() => setSelectedExercise(lift.exerciseName ?? null)}
                  style={[
                    styles.tab,
                    selectedExercise === lift.exerciseName && styles.tabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedExercise === lift.exerciseName && styles.tabTextActive,
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
            <EmptyState title="No exercise history yet" subtitle="Finish workouts to build this chart." sparkline />
          </Card>
        )}
      </View>

      <View>
        <SectionHeader title="Volume Progression" />
        <LineChartCard
          title="Total Volume Per Workout"
          labels={volumeSeries.map((v) => shortDate(v.date))}
          values={volumeSeries.map((v) => v.volume)}
          suffix={settings.units}
          lineColor={colors.textTertiary}
        />
      </View>

      <View>
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
      </View>

      <View>
        <SectionHeader title="Best Lift by Exercise" />
        {bestLifts.length > 0 ? (
          bestLifts.map((lift, index) => (
            <View
              key={lift.exerciseId}
              style={[styles.liftRow, index > 0 && styles.liftRowBorder]}
            >
              <Text style={styles.liftName}>{lift.exerciseName}</Text>
              <Text style={styles.liftValue}>
                {formatWeight(lift.weight, settings.units)} × {lift.reps}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState title="No records yet" />
        )}
      </View>

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
