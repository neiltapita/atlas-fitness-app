import type { SQLiteDatabase } from "expo-sqlite";
import { SEED_EXERCISES } from "@/constants/exercises";
import { SEED_FOODS } from "@/constants/foods";

/**
 * Seeds the exercise library, food library, and default settings. Safe to
 * call every app start; each step is idempotent.
 */
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO usersettings (id, units, default_rest_seconds, theme) VALUES (1, 'lb', 90, 'dark');`
  );

  // Insert any seed exercises not already present by name, so growing this
  // list adds the new ones without duplicating what's already in the DB.
  const existingExerciseNames = new Set(
    (await db.getAllAsync<{ name: string }>(`SELECT name FROM exercises;`)).map((r) => r.name)
  );
  for (const ex of SEED_EXERCISES) {
    if (existingExerciseNames.has(ex.name)) continue;
    await db.runAsync(
      `INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_favorite) VALUES (?, ?, ?, 0, 0);`,
      [ex.name, ex.muscleGroup, ex.equipment]
    );
  }

  // Same idempotent pattern for the food library.
  const existingFoodNames = new Set(
    (await db.getAllAsync<{ name: string }>(`SELECT name FROM foods;`)).map((r) => r.name)
  );
  for (const food of SEED_FOODS) {
    if (existingFoodNames.has(food.name)) continue;
    await db.runAsync(
      `INSERT INTO foods (name, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, is_custom, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0);`,
      [
        food.name,
        food.servingSize,
        food.servingUnit,
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
        food.fiber,
        food.sugar,
        food.sodium,
      ]
    );
  }
}
