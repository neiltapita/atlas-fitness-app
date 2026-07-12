import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { muscleGroupColors, radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { Exercise } from "@/types";

interface ExerciseListItemProps {
  exercise: Exercise;
  onPress: () => void;
  onToggleFavorite?: () => void;
  trailing?: React.ReactNode;
}

export function ExerciseListItem({
  exercise,
  onPress,
  onToggleFavorite,
  trailing,
}: ExerciseListItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  meta: {
    ...typography.tiny,
    color: colors.textTertiary,
  },
  favorite: {
    padding: spacing.xs,
  },
}),
    [colors]
  );
  const dotColor = muscleGroupColors[exercise.muscleGroup] ?? colors.textTertiary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.textBlock}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.meta}>
          {exercise.muscleGroup} · {exercise.equipment}
        </Text>
      </View>
      {trailing}
      {onToggleFavorite ? (
        <Pressable onPress={onToggleFavorite} hitSlop={10} style={styles.favorite}>
          <Text style={{ color: exercise.isFavorite ? colors.accent : colors.textTertiary }}>
            {exercise.isFavorite ? "★" : "☆"}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
