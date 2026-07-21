import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import { EmptyState } from "@/components/EmptyState";
import {
  BodyRegion,
  GRADABLE_REGIONS,
  REGION_EXERCISE,
  REGION_LABELS,
  STRENGTH_TIERS,
  TIER_COLORS,
} from "@/constants/strengthStandards";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { WeightUnit } from "@/types";
import { formatWeight } from "@/utils/calculations";

export interface RegionDetail {
  /** Tier index 0 (Beginner) .. 5 (World Class), or null if ungraded/no data. */
  tier: number | null;
  weight: number | null;
}

interface MuscleMapProps {
  details: Record<BodyRegion, RegionDetail>;
  units: WeightUnit;
  hasBodyweight: boolean;
}

export function MuscleMap({ details, units, hasBodyweight }: MuscleMapProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  diagrams: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  regionName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  exerciseName: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  tierText: {
    ...typography.caption,
    fontWeight: "700",
  },
  ungradedText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  caption: {
    ...typography.tiny,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
}),
    [colors]
  );

  const fillFor = (region: BodyRegion) => {
    const tier = details[region]?.tier;
    return tier != null ? TIER_COLORS[tier] : colors.border;
  };

  if (!hasBodyweight) {
    return (
      <EmptyState
        title="Log your bodyweight to see this"
        subtitle="Muscle Map estimates strength level relative to your bodyweight — tap + Log weight below to get started."
      />
    );
  }

  const allRegions: BodyRegion[] = [...GRADABLE_REGIONS, "abs"];

  return (
    <View>
      <View style={styles.diagrams}>
        <FrontBody fillFor={fillFor} neutral={colors.surfaceElevated} />
        <BackBody fillFor={fillFor} neutral={colors.surfaceElevated} />
      </View>

      <View style={styles.legend}>
        {STRENGTH_TIERS.map((label, i) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[i] }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {allRegions.map((region, index) => {
        const detail = details[region];
        const exerciseName = region === "abs" ? null : REGION_EXERCISE[region];
        return (
          <View key={region} style={[styles.row, index === 0 && styles.rowFirst]}>
            <View>
              <Text style={styles.regionName}>{REGION_LABELS[region]}</Text>
              <Text style={styles.exerciseName}>
                {exerciseName ?? "Not graded — no bodyweight-relative standard"}
              </Text>
            </View>
            {detail?.tier != null && detail.weight != null ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.tierText, { color: TIER_COLORS[detail.tier] }]}>
                  {STRENGTH_TIERS[detail.tier]}
                </Text>
                <Text style={styles.exerciseName}>{formatWeight(detail.weight, units)}</Text>
              </View>
            ) : (
              <Text style={styles.ungradedText}>
                {exerciseName ? "Not logged" : "—"}
              </Text>
            )}
          </View>
        );
      })}

      <Text style={styles.caption}>
        Estimated strength level based on general bodyweight-relative benchmarks —
        not an official or clinical standard.
      </Text>
    </View>
  );
}

function FrontBody({
  fillFor,
  neutral,
}: {
  fillFor: (region: BodyRegion) => string;
  neutral: string;
}) {
  return (
    <Svg width={130} height={260} viewBox="0 0 130 260">
      {/* head + neck (neutral) */}
      <Circle cx={65} cy={20} r={14} fill={neutral} />
      <Rect x={58} y={32} width={14} height={12} rx={4} fill={neutral} />
      {/* shoulders */}
      <Ellipse cx={36} cy={56} rx={15} ry={11} fill={fillFor("shoulders")} />
      <Ellipse cx={94} cy={56} rx={15} ry={11} fill={fillFor("shoulders")} />
      {/* chest */}
      <Rect x={41} y={50} width={48} height={32} rx={14} fill={fillFor("chest")} />
      {/* biceps */}
      <Rect x={16} y={58} width={17} height={42} rx={8} fill={fillFor("biceps")} />
      <Rect x={97} y={58} width={17} height={42} rx={8} fill={fillFor("biceps")} />
      {/* forearms + hands (neutral) */}
      <Rect x={14} y={100} width={15} height={42} rx={7} fill={neutral} />
      <Rect x={101} y={100} width={15} height={42} rx={7} fill={neutral} />
      <Circle cx={21} cy={146} r={7} fill={neutral} />
      <Circle cx={109} cy={146} r={7} fill={neutral} />
      {/* abs */}
      <Rect x={46} y={84} width={38} height={42} rx={12} fill={fillFor("abs")} />
      {/* waist (neutral) */}
      <Rect x={39} y={126} width={52} height={18} rx={9} fill={neutral} />
      {/* quads */}
      <Rect x={37} y={144} width={23} height={56} rx={11} fill={fillFor("quads")} />
      <Rect x={70} y={144} width={23} height={56} rx={11} fill={fillFor("quads")} />
      {/* shins + feet (neutral) */}
      <Rect x={39} y={200} width={19} height={42} rx={9} fill={neutral} />
      <Rect x={72} y={200} width={19} height={42} rx={9} fill={neutral} />
      <Ellipse cx={48} cy={250} rx={11} ry={7} fill={neutral} />
      <Ellipse cx={82} cy={250} rx={11} ry={7} fill={neutral} />
    </Svg>
  );
}

function BackBody({
  fillFor,
  neutral,
}: {
  fillFor: (region: BodyRegion) => string;
  neutral: string;
}) {
  return (
    <Svg width={130} height={260} viewBox="0 0 130 260">
      {/* head + neck (neutral) */}
      <Circle cx={65} cy={20} r={14} fill={neutral} />
      <Rect x={58} y={32} width={14} height={12} rx={4} fill={neutral} />
      {/* back (trapezoid: shoulders wide, waist narrower) */}
      <Rect x={35} y={48} width={60} height={78} rx={18} fill={fillFor("back")} />
      {/* triceps */}
      <Rect x={16} y={58} width={17} height={42} rx={8} fill={fillFor("triceps")} />
      <Rect x={97} y={58} width={17} height={42} rx={8} fill={fillFor("triceps")} />
      {/* forearms + hands (neutral) */}
      <Rect x={14} y={100} width={15} height={42} rx={7} fill={neutral} />
      <Rect x={101} y={100} width={15} height={42} rx={7} fill={neutral} />
      <Circle cx={21} cy={146} r={7} fill={neutral} />
      <Circle cx={109} cy={146} r={7} fill={neutral} />
      {/* glutes */}
      <Rect x={39} y={126} width={52} height={30} rx={16} fill={fillFor("glutes")} />
      {/* hamstrings */}
      <Rect x={37} y={156} width={23} height={48} rx={11} fill={fillFor("hamstrings")} />
      <Rect x={70} y={156} width={23} height={48} rx={11} fill={fillFor("hamstrings")} />
      {/* calves */}
      <Rect x={39} y={204} width={19} height={38} rx={9} fill={fillFor("calves")} />
      <Rect x={72} y={204} width={19} height={38} rx={9} fill={fillFor("calves")} />
      {/* feet (neutral) */}
      <Ellipse cx={48} cy={250} rx={11} ry={7} fill={neutral} />
      <Ellipse cx={82} cy={250} rx={11} ry={7} fill={neutral} />
    </Svg>
  );
}
