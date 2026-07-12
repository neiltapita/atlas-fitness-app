import type { SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { wipeAllData } from "@/db/queries";

interface ExportBundle {
  version: 1 | 2;
  exportedAt: string;
  exercises: Record<string, unknown>[];
  workouts: Record<string, unknown>[];
  workout_exercises: Record<string, unknown>[];
  sets: Record<string, unknown>[];
  personal_records: Record<string, unknown>[];
  bodyweight_entries: Record<string, unknown>[];
  usersettings: Record<string, unknown>[];
  workout_templates: Record<string, unknown>[];
  template_exercises: Record<string, unknown>[];
  template_sets: Record<string, unknown>[];
  food_brands: Record<string, unknown>[];
  foods: Record<string, unknown>[];
  meals: Record<string, unknown>[];
  meal_items: Record<string, unknown>[];
  nutrition_entries: Record<string, unknown>[];
  daily_logs: Record<string, unknown>[];
}

export async function exportWorkoutData(db: SQLiteDatabase): Promise<string> {
  const bundle: ExportBundle = {
    version: 2,
    exportedAt: new Date().toISOString(),
    exercises: await db.getAllAsync(`SELECT * FROM exercises;`),
    workouts: await db.getAllAsync(`SELECT * FROM workouts;`),
    workout_exercises: await db.getAllAsync(`SELECT * FROM workout_exercises;`),
    sets: await db.getAllAsync(`SELECT * FROM sets;`),
    personal_records: await db.getAllAsync(`SELECT * FROM personal_records;`),
    bodyweight_entries: await db.getAllAsync(`SELECT * FROM bodyweight_entries;`),
    usersettings: await db.getAllAsync(`SELECT * FROM usersettings;`),
    workout_templates: await db.getAllAsync(`SELECT * FROM workout_templates;`),
    template_exercises: await db.getAllAsync(`SELECT * FROM template_exercises;`),
    template_sets: await db.getAllAsync(`SELECT * FROM template_sets;`),
    food_brands: await db.getAllAsync(`SELECT * FROM food_brands;`),
    foods: await db.getAllAsync(`SELECT * FROM foods;`),
    meals: await db.getAllAsync(`SELECT * FROM meals;`),
    meal_items: await db.getAllAsync(`SELECT * FROM meal_items;`),
    nutrition_entries: await db.getAllAsync(`SELECT * FROM nutrition_entries;`),
    daily_logs: await db.getAllAsync(`SELECT * FROM daily_logs;`),
  };

  const json = JSON.stringify(bundle, null, 2);
  const fileName = `gym-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      dialogTitle: "Export Atlas Data",
      UTI: "public.json",
    });
  }
  return fileUri;
}

export async function pickAndImportWorkoutData(
  db: SQLiteDatabase
): Promise<{ imported: boolean; message: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { imported: false, message: "Import cancelled." };
  }

  const fileUri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let bundle: Partial<ExportBundle>;
  try {
    bundle = JSON.parse(content);
  } catch {
    return { imported: false, message: "That file isn't valid JSON." };
  }

  if (!bundle || (bundle.version !== 1 && bundle.version !== 2)) {
    return { imported: false, message: "Unrecognized or incompatible export file." };
  }

  // Version 1 exports predate templates/nutrition — default the newer
  // sections to empty so older backups still import cleanly.
  const workoutTemplates = bundle.workout_templates ?? [];
  const templateExercises = bundle.template_exercises ?? [];
  const templateSets = bundle.template_sets ?? [];
  const foodBrands = bundle.food_brands ?? [];
  const foods = bundle.foods ?? [];
  const meals = bundle.meals ?? [];
  const mealItems = bundle.meal_items ?? [];
  const nutritionEntries = bundle.nutrition_entries ?? [];
  const dailyLogs = bundle.daily_logs ?? [];

  await wipeAllData(db);

  // Exercises: merge by name so IDs referenced by workouts/templates stay valid on this device.
  const nameToId = new Map<string, number>();
  const existingExercises = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM exercises;`
  );
  for (const e of existingExercises) nameToId.set(e.name, e.id);

  for (const ex of bundle.exercises ?? []) {
    const name = ex.name as string;
    if (nameToId.has(name)) continue;
    const inserted = await db.runAsync(
      `INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_favorite) VALUES (?, ?, ?, ?, ?);`,
      [
        name,
        ex.muscle_group as string,
        ex.equipment as string,
        (ex.is_custom as number) ?? 1,
        (ex.is_favorite as number) ?? 0,
      ]
    );
    nameToId.set(name, inserted.lastInsertRowId);
  }

  const oldExerciseIdToName = new Map<number, string>();
  for (const ex of bundle.exercises ?? []) {
    oldExerciseIdToName.set(ex.id as number, ex.name as string);
  }

  const oldWorkoutIdToNew = new Map<number, number>();
  for (const w of bundle.workouts ?? []) {
    const inserted = await db.runAsync(
      `INSERT INTO workouts (name, date, started_at, finished_at, notes) VALUES (?, ?, ?, ?, ?);`,
      [
        w.name as string,
        w.date as string,
        w.started_at as string,
        (w.finished_at as string | null) ?? null,
        (w.notes as string | null) ?? null,
      ]
    );
    oldWorkoutIdToNew.set(w.id as number, inserted.lastInsertRowId);
  }

  const oldWeIdToNew = new Map<number, number>();
  for (const we of bundle.workout_exercises ?? []) {
    const newWorkoutId = oldWorkoutIdToNew.get(we.workout_id as number);
    const exerciseName = oldExerciseIdToName.get(we.exercise_id as number);
    const newExerciseId = exerciseName ? nameToId.get(exerciseName) : undefined;
    if (!newWorkoutId || !newExerciseId) continue;
    const inserted = await db.runAsync(
      `INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes) VALUES (?, ?, ?, ?);`,
      [newWorkoutId, newExerciseId, (we.order_index as number) ?? 0, (we.notes as string | null) ?? null]
    );
    oldWeIdToNew.set(we.id as number, inserted.lastInsertRowId);
  }

  for (const s of bundle.sets ?? []) {
    const newWeId = oldWeIdToNew.get(s.workout_exercise_id as number);
    if (!newWeId) continue;
    await db.runAsync(
      `INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe, notes, completed, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newWeId,
        s.set_number as number,
        s.weight as number,
        s.reps as number,
        (s.rpe as number | null) ?? null,
        (s.notes as string | null) ?? null,
        (s.completed as number) ?? 0,
        (s.rest_seconds as number) ?? 90,
      ]
    );
  }

  for (const pr of bundle.personal_records ?? []) {
    const exerciseName = oldExerciseIdToName.get(pr.exercise_id as number);
    const newExerciseId = exerciseName ? nameToId.get(exerciseName) : undefined;
    const newWorkoutId = oldWorkoutIdToNew.get(pr.workout_id as number);
    if (!newExerciseId || !newWorkoutId) continue;
    await db.runAsync(
      `INSERT INTO personal_records (exercise_id, weight, reps, estimated_1rm, date, workout_id) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        newExerciseId,
        pr.weight as number,
        pr.reps as number,
        pr.estimated_1rm as number,
        pr.date as string,
        newWorkoutId,
      ]
    );
  }

  for (const bw of bundle.bodyweight_entries ?? []) {
    await db.runAsync(`INSERT INTO bodyweight_entries (date, weight) VALUES (?, ?);`, [
      bw.date as string,
      bw.weight as number,
    ]);
  }

  // Workout templates: same exercise-name remapping as live workouts.
  const oldTemplateIdToNew = new Map<number, number>();
  for (const t of workoutTemplates) {
    const inserted = await db.runAsync(
      `INSERT INTO workout_templates (name, created_at) VALUES (?, ?);`,
      [t.name as string, t.created_at as string]
    );
    oldTemplateIdToNew.set(t.id as number, inserted.lastInsertRowId);
  }

  const oldTemplateExerciseIdToNew = new Map<number, number>();
  for (const te of templateExercises) {
    const newTemplateId = oldTemplateIdToNew.get(te.template_id as number);
    const exerciseName = oldExerciseIdToName.get(te.exercise_id as number);
    const newExerciseId = exerciseName ? nameToId.get(exerciseName) : undefined;
    if (!newTemplateId || !newExerciseId) continue;
    const inserted = await db.runAsync(
      `INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, notes, sticky_note) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        newTemplateId,
        newExerciseId,
        (te.order_index as number) ?? 0,
        (te.target_sets as number) ?? 3,
        (te.notes as string | null) ?? null,
        (te.sticky_note as string | null) ?? null,
      ]
    );
    oldTemplateExerciseIdToNew.set(te.id as number, inserted.lastInsertRowId);
  }

  for (const ts of templateSets) {
    const newTemplateExerciseId = oldTemplateExerciseIdToNew.get(ts.template_exercise_id as number);
    if (!newTemplateExerciseId) continue;
    await db.runAsync(
      `INSERT INTO template_sets (template_exercise_id, set_number, weight, reps, is_warmup) VALUES (?, ?, ?, ?, ?);`,
      [
        newTemplateExerciseId,
        ts.set_number as number,
        (ts.weight as number) ?? 0,
        (ts.reps as number) ?? 0,
        (ts.is_warmup as number) ?? 0,
      ]
    );
  }

  // Food brands + foods: merge by name, same rationale as exercises (the
  // device already has its own seeded library that must not be duplicated).
  const brandNameToId = new Map<string, number>();
  const existingBrands = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM food_brands;`
  );
  for (const b of existingBrands) brandNameToId.set(b.name, b.id);

  const oldBrandIdToNew = new Map<number, number>();
  for (const b of foodBrands) {
    const name = b.name as string;
    let newId = brandNameToId.get(name);
    if (newId === undefined) {
      const inserted = await db.runAsync(`INSERT INTO food_brands (name) VALUES (?);`, [name]);
      newId = inserted.lastInsertRowId;
      brandNameToId.set(name, newId);
    }
    oldBrandIdToNew.set(b.id as number, newId);
  }

  const foodNameToId = new Map<string, number>();
  const existingFoods = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM foods;`
  );
  for (const f of existingFoods) foodNameToId.set(f.name, f.id);

  const oldFoodIdToName = new Map<number, string>();
  for (const f of foods) {
    const name = f.name as string;
    oldFoodIdToName.set(f.id as number, name);
    if (foodNameToId.has(name)) continue;
    const newBrandId =
      f.brand_id != null ? oldBrandIdToNew.get(f.brand_id as number) ?? null : null;
    const inserted = await db.runAsync(
      `INSERT INTO foods (name, brand_id, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, is_custom, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        name,
        newBrandId,
        (f.serving_size as number) ?? 100,
        (f.serving_unit as string) ?? "g",
        (f.calories as number) ?? 0,
        (f.protein as number) ?? 0,
        (f.carbs as number) ?? 0,
        (f.fat as number) ?? 0,
        (f.fiber as number) ?? 0,
        (f.sugar as number) ?? 0,
        (f.sodium as number) ?? 0,
        (f.is_custom as number) ?? 1,
        (f.is_favorite as number) ?? 0,
      ]
    );
    foodNameToId.set(name, inserted.lastInsertRowId);
  }

  const oldMealIdToNew = new Map<number, number>();
  for (const m of meals) {
    const inserted = await db.runAsync(`INSERT INTO meals (name, created_at) VALUES (?, ?);`, [
      m.name as string,
      m.created_at as string,
    ]);
    oldMealIdToNew.set(m.id as number, inserted.lastInsertRowId);
  }

  for (const mi of mealItems) {
    const newMealId = oldMealIdToNew.get(mi.meal_id as number);
    const foodName = oldFoodIdToName.get(mi.food_id as number);
    const newFoodId = foodName ? foodNameToId.get(foodName) : undefined;
    if (!newMealId || !newFoodId) continue;
    await db.runAsync(
      `INSERT INTO meal_items (meal_id, food_id, quantity, order_index) VALUES (?, ?, ?, ?);`,
      [newMealId, newFoodId, (mi.quantity as number) ?? 1, (mi.order_index as number) ?? 0]
    );
  }

  for (const ne of nutritionEntries) {
    let newFoodId: number | null = null;
    let newMealId: number | null = null;
    if (ne.food_id != null) {
      const foodName = oldFoodIdToName.get(ne.food_id as number);
      newFoodId = (foodName ? foodNameToId.get(foodName) : undefined) ?? null;
    }
    if (ne.meal_id != null) {
      newMealId = oldMealIdToNew.get(ne.meal_id as number) ?? null;
    }
    if (newFoodId === null && newMealId === null) continue;
    await db.runAsync(
      `INSERT INTO nutrition_entries (date, logged_at, meal_type, food_id, meal_id, quantity, calories, protein, carbs, fat, fiber, sugar, sodium) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        ne.date as string,
        ne.logged_at as string,
        (ne.meal_type as string) ?? "snack",
        newFoodId,
        newMealId,
        (ne.quantity as number) ?? 1,
        (ne.calories as number) ?? 0,
        (ne.protein as number) ?? 0,
        (ne.carbs as number) ?? 0,
        (ne.fat as number) ?? 0,
        (ne.fiber as number) ?? 0,
        (ne.sugar as number) ?? 0,
        (ne.sodium as number) ?? 0,
      ]
    );
  }

  for (const dl of dailyLogs) {
    await db.runAsync(`INSERT INTO daily_logs (date, water_ml, notes) VALUES (?, ?, ?);`, [
      dl.date as string,
      (dl.water_ml as number) ?? 0,
      (dl.notes as string | null) ?? null,
    ]);
  }

  if (bundle.usersettings && bundle.usersettings.length > 0) {
    const s = bundle.usersettings[0];
    await db.runAsync(
      `UPDATE usersettings SET units = ?, default_rest_seconds = ?, theme = ? WHERE id = 1;`,
      [s.units as string, s.default_rest_seconds as number, s.theme as string]
    );
  }

  return { imported: true, message: "Import complete." };
}
