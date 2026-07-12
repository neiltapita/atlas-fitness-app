import type { SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { wipeAllData } from "@/db/queries";

interface ExportBundle {
  version: 1;
  exportedAt: string;
  exercises: Record<string, unknown>[];
  workouts: Record<string, unknown>[];
  workout_exercises: Record<string, unknown>[];
  sets: Record<string, unknown>[];
  personal_records: Record<string, unknown>[];
  bodyweight_entries: Record<string, unknown>[];
  usersettings: Record<string, unknown>[];
}

export async function exportWorkoutData(db: SQLiteDatabase): Promise<string> {
  const bundle: ExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await db.getAllAsync(`SELECT * FROM exercises;`),
    workouts: await db.getAllAsync(`SELECT * FROM workouts;`),
    workout_exercises: await db.getAllAsync(`SELECT * FROM workout_exercises;`),
    sets: await db.getAllAsync(`SELECT * FROM sets;`),
    personal_records: await db.getAllAsync(`SELECT * FROM personal_records;`),
    bodyweight_entries: await db.getAllAsync(`SELECT * FROM bodyweight_entries;`),
    usersettings: await db.getAllAsync(`SELECT * FROM usersettings;`),
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
      dialogTitle: "Export Gym Tracker Data",
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

  let bundle: ExportBundle;
  try {
    bundle = JSON.parse(content);
  } catch {
    return { imported: false, message: "That file isn't valid JSON." };
  }

  if (!bundle || bundle.version !== 1) {
    return { imported: false, message: "Unrecognized or incompatible export file." };
  }

  await wipeAllData(db);

  // Exercises: merge by name so IDs referenced by workouts stay valid on this device.
  const nameToId = new Map<string, number>();
  const existingExercises = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM exercises;`
  );
  for (const e of existingExercises) nameToId.set(e.name, e.id);

  for (const ex of bundle.exercises) {
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
  for (const ex of bundle.exercises) {
    oldExerciseIdToName.set(ex.id as number, ex.name as string);
  }

  const oldWorkoutIdToNew = new Map<number, number>();
  for (const w of bundle.workouts) {
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
  for (const we of bundle.workout_exercises) {
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

  for (const s of bundle.sets) {
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

  for (const pr of bundle.personal_records) {
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

  for (const bw of bundle.bodyweight_entries) {
    await db.runAsync(`INSERT INTO bodyweight_entries (date, weight) VALUES (?, ?);`, [
      bw.date as string,
      bw.weight as number,
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
