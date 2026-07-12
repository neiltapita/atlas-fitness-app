import React, { useCallback, useState, useMemo } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { deleteTemplate, getTemplateDetail, getTemplates } from "@/db/queries";
import { WorkoutTemplate } from "@/types";
import { haptics } from "@/utils/haptics";

interface TemplateRow extends WorkoutTemplate {
  exerciseSummary: string;
}

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  newButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xs,
  },
  name: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
}),
    [colors]
  );
  const db = useSQLiteContext();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  const load = useCallback(async () => {
    const list = await getTemplates(db);
    const rows: TemplateRow[] = [];
    for (const t of list) {
      const detail = await getTemplateDetail(db, t.id);
      const names = detail?.exercises.map((e) => e.exerciseName).filter(Boolean) ?? [];
      rows.push({
        ...t,
        exerciseSummary: names.length > 0 ? names.join(", ") : "No exercises yet",
      });
    }
    setTemplates(rows);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (template: TemplateRow) => {
    Alert.alert("Delete Template", `Delete "${template.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          haptics.warning();
          await deleteTemplate(db, template.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PrimaryButton
        title="+ New Template"
        onPress={() => router.push("/templates/create")}
        style={styles.newButton}
      />

      <FlatList
        data={templates}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No templates yet"
            subtitle="Create a template like Push, Pull, or Legs to start workouts from it instantly."
            icon="📋"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/templates/[id]", params: { id: String(item.id) } })}
            onLongPress={() => handleDelete(item)}
          >
            <Card style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.summary} numberOfLines={2}>
                {item.exerciseSummary}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
