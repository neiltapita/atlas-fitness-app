import React, { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { SetEntry } from "@/types";
import { haptics } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SetRowProps {
  set: SetEntry;
  setIndex: number;
  unit: "kg" | "lb";
  onChange: (fields: Partial<Pick<SetEntry, "weight" | "reps" | "rpe" | "notes" | "completed">>) => void;
  onDelete: () => void;
  onComplete: () => void;
}

export function SetRow({ set, setIndex, unit, onChange, onDelete, onComplete }: SetRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  completedContainer: {
    backgroundColor: colors.accentMuted,
    borderRadius: radii.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  setNumberBox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumber: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
    textAlign: "center",
    minWidth: 48,
  },
  rpeInput: {
    width: 52,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    color: colors.textPrimary,
    ...typography.caption,
    textAlign: "center",
  },
  unitLabel: {
    ...typography.tiny,
    color: colors.textTertiary,
    width: 28,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: "#0B2016",
    fontWeight: "800",
  },
  notesInput: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  addNoteLink: {
    ...typography.tiny,
    color: colors.textTertiary,
    paddingHorizontal: spacing.xs,
  },
}),
    [colors]
  );
  const [showNotes, setShowNotes] = useState(!!set.notes);
  // Local drafts so a trailing "." (or "8.50") isn't immediately stripped by
  // re-deriving the displayed value from the parsed number on every
  // keystroke, which made decimal weight/RPE impossible to type.
  const [weightText, setWeightText] = useState(set.weight ? String(set.weight) : "");
  const [rpeText, setRpeText] = useState(set.rpe != null ? String(set.rpe) : "");
  const checkScale = useSharedValue(1);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleComplete = () => {
    haptics.select();
    checkScale.value = withSequence(
      withSpring(1.25, { damping: 10, stiffness: 500 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    onComplete();
  };

  return (
    <View style={[styles.container, set.completed && styles.completedContainer]}>
      <View style={styles.row}>
        <Pressable
          onLongPress={() => {
            haptics.warning();
            onDelete();
          }}
          style={styles.setNumberBox}
        >
          <Text style={styles.setNumber}>{setIndex + 1}</Text>
        </Pressable>

        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          value={weightText}
          onChangeText={(t) => {
            setWeightText(t);
            onChange({ weight: parseFloat(t) || 0 });
          }}
        />
        <Text style={styles.unitLabel}>{unit}</Text>

        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          value={set.reps ? String(set.reps) : ""}
          onChangeText={(t) => onChange({ reps: parseInt(t, 10) || 0 })}
        />
        <Text style={styles.unitLabel}>reps</Text>

        <TextInput
          style={styles.rpeInput}
          keyboardType="decimal-pad"
          placeholder="RPE"
          placeholderTextColor={colors.textTertiary}
          value={rpeText}
          onChangeText={(t) => {
            setRpeText(t);
            onChange({ rpe: t ? parseFloat(t) : null });
          }}
        />

        <AnimatedPressable
          onPress={handleComplete}
          style={[styles.checkbox, set.completed && styles.checkboxChecked, checkAnimatedStyle]}
        >
          {set.completed ? <Text style={styles.checkmark}>✓</Text> : null}
        </AnimatedPressable>
      </View>

      {showNotes || set.notes ? (
        <TextInput
          style={styles.notesInput}
          placeholder="Notes for this set..."
          placeholderTextColor={colors.textTertiary}
          value={set.notes ?? ""}
          onChangeText={(t) => onChange({ notes: t })}
        />
      ) : (
        <Pressable onPress={() => setShowNotes(true)}>
          <Text style={styles.addNoteLink}>+ note</Text>
        </Pressable>
      )}
    </View>
  );
}
