import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { createMeal } from "@/db/nutritionQueries";

export default function CreateMealScreen() {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
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
  });
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const finalName = name.trim() || "New Meal";
    const id = await createMeal(db, finalName);
    router.replace({ pathname: "/nutrition/meals/[id]", params: { id: String(id) } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Meal Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Protein Shake"
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <PrimaryButton title="Create & Add Foods" onPress={handleCreate} style={styles.button} />
    </View>
  );
}
