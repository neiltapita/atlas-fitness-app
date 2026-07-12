import React, { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useActiveWorkout } from "@/context/ActiveWorkoutContext";

export default function CreateWorkoutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    ...typography.body,
  },
  button: {
    marginTop: spacing.md,
  },
}),
    [colors]
  );
  const router = useRouter();
  const { startWorkout } = useActiveWorkout();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const finalName = name.trim() || "New Workout";
    await startWorkout(finalName);
    router.replace("/workout/active");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Workout Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Push Day"
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <PrimaryButton title="Create & Start" onPress={handleCreate} style={styles.button} />
    </View>
  );
}
