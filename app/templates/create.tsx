import React, { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { createTemplate } from "@/db/queries";

export default function CreateTemplateScreen() {
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
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const finalName = name.trim() || "New Template";
    const id = await createTemplate(db, finalName);
    router.replace({ pathname: "/templates/[id]", params: { id: String(id) } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Template Name</Text>
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
      <PrimaryButton title="Create & Add Exercises" onPress={handleCreate} style={styles.button} />
    </View>
  );
}
