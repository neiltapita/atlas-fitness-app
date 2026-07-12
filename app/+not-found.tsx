import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Link, Stack } from "expo-router";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { Text } from "react-native";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  link: {
    ...typography.body,
    color: colors.accent,
  },
}),
    [colors]
  );
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          Go back home
        </Link>
      </View>
    </>
  );
}
