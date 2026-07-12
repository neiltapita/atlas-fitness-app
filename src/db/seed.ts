import type { SQLiteDatabase } from "expo-sqlite";
import { SEED_EXERCISES } from "@/constants/exercises";

/**
 * Seeds the exercise library and default settings. Safe to call every
 * app start; each step is idempotent.
 */
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO usersettings (id, units, default_rest_seconds, theme) VALUES (1, 'lb', 90, 'dark');`
  );

  // Insert any seed exercises not already present by name, so growing this
  // list adds the new ones without duplicating what's already in the DB.
  const existingNames = new Set(
    (await db.getAllAsync<{ name: string }>(`SELECT name FROM exercises;`)).map((r) => r.name)
  );
  for (const ex of SEED_EXERCISES) {
    if (existingNames.has(ex.name)) continue;
    await db.runAsync(
      `INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_favorite) VALUES (?, ?, ?, 0, 0);`,
      [ex.name, ex.muscleGroup, ex.equipment]
    );
  }
}
