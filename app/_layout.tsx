import React, { Suspense } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { MIGRATIONS_SQL, SCHEMA_SQL } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { SettingsProvider } from "@/context/SettingsContext";
import { ActiveWorkoutProvider } from "@/context/ActiveWorkoutContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";

async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(SCHEMA_SQL);
  for (const migration of MIGRATIONS_SQL) {
    try {
      await db.execAsync(migration);
    } catch {
      // Column already exists from a previous run; safe to ignore.
    }
  }
  await seedDatabase(db);
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/create"
          options={{ presentation: "modal", title: "New Workout" }}
        />
        <Stack.Screen
          name="workout/active"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
        <Stack.Screen
          name="exercise/picker"
          options={{ presentation: "modal", title: "Add Exercise" }}
        />
        <Stack.Screen name="exercise/[id]" options={{ title: "Exercise" }} />
        <Stack.Screen name="templates/index" options={{ title: "Templates" }} />
        <Stack.Screen
          name="templates/create"
          options={{ presentation: "modal", title: "New Template" }}
        />
        <Stack.Screen name="templates/[id]" options={{ title: "Edit Template" }} />
        <Stack.Screen
          name="nutrition/log"
          options={{ presentation: "modal", title: "Log Food" }}
        />
        <Stack.Screen name="nutrition/meals/index" options={{ title: "My Meals" }} />
        <Stack.Screen
          name="nutrition/meals/create"
          options={{ presentation: "modal", title: "New Meal" }}
        />
        <Stack.Screen name="nutrition/meals/[id]" options={{ title: "Edit Meal" }} />
        <Stack.Screen
          name="nutrition/photo"
          options={{ presentation: "modal", title: "Log from Photo" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider databaseName="gymtracker.db" onInit={initDatabase} useSuspense>
        <SettingsProvider>
          <ThemeProvider>
            <ActiveWorkoutProvider>
              <RootStack />
            </ActiveWorkoutProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
