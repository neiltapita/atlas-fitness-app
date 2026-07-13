import type { SQLiteDatabase } from "expo-sqlite";
import {
  BodyweightEntry,
  Exercise,
  MuscleGroup,
  PersonalRecord,
  SetEntry,
  TemplateExercise,
  TemplateExerciseWithSets,
  TemplateSet,
  UserSettings,
  WorkoutDetail,
  WorkoutExerciseWithSets,
  WorkoutSummary,
  WorkoutTemplate,
  WorkoutTemplateDetail,
  ExerciseHistoryPoint,
} from "@/types";
import { normalizeTabOrder } from "@/constants/tabs";
import { epley1RM } from "@/utils/calculations";

// ---------- Row shapes coming back from SQLite (snake_case) ----------

interface ExerciseRow {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: number;
  is_favorite: number;
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment,
    isCustom: !!row.is_custom,
    isFavorite: !!row.is_favorite,
  };
}

interface SetRow {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  notes: string | null;
  completed: number;
  rest_seconds: number;
}

function mapSet(row: SetRow): SetEntry {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
    rpe: row.rpe,
    notes: row.notes,
    completed: !!row.completed,
    restSeconds: row.rest_seconds,
  };
}

// ================= Exercises =================

export async function getAllExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises ORDER BY is_favorite DESC, name ASC;`
  );
  return rows.map(mapExercise);
}

export async function searchExercises(
  db: SQLiteDatabase,
  query: string,
  muscleGroup?: MuscleGroup | "All"
): Promise<Exercise[]> {
  const like = `%${query}%`;
  if (muscleGroup && muscleGroup !== "All") {
    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE name LIKE ? AND muscle_group = ? ORDER BY is_favorite DESC, name ASC;`,
      [like, muscleGroup]
    );
    return rows.map(mapExercise);
  }
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE name LIKE ? ORDER BY is_favorite DESC, name ASC;`,
    [like]
  );
  return rows.map(mapExercise);
}

export async function getExerciseById(
  db: SQLiteDatabase,
  id: number
): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id = ?;`,
    [id]
  );
  return row ? mapExercise(row) : null;
}

export async function createCustomExercise(
  db: SQLiteDatabase,
  name: string,
  muscleGroup: MuscleGroup,
  equipment: string
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_favorite) VALUES (?, ?, ?, 1, 0);`,
    [name, muscleGroup, equipment]
  );
  return result.lastInsertRowId;
}

export async function toggleFavoriteExercise(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    `UPDATE exercises SET is_favorite = NOT is_favorite WHERE id = ?;`,
    [id]
  );
}

// ================= Workouts =================

export async function createWorkout(
  db: SQLiteDatabase,
  name: string
): Promise<number> {
  const now = new Date();
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const result = await db.runAsync(
    `INSERT INTO workouts (name, date, started_at, finished_at, notes) VALUES (?, ?, ?, NULL, NULL);`,
    [name, date, iso]
  );
  return result.lastInsertRowId;
}

export async function renameWorkout(
  db: SQLiteDatabase,
  workoutId: number,
  name: string
): Promise<void> {
  await db.runAsync(`UPDATE workouts SET name = ? WHERE id = ?;`, [name, workoutId]);
}

export async function finishWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<void> {
  await db.runAsync(`UPDATE workouts SET finished_at = ? WHERE id = ?;`, [
    new Date().toISOString(),
    workoutId,
  ]);
  await recomputePersonalRecordsForWorkout(db, workoutId);
}

export async function deleteWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<void> {
  await db.runAsync(`DELETE FROM workouts WHERE id = ?;`, [workoutId]);
}

export async function repeatWorkout(
  db: SQLiteDatabase,
  sourceWorkoutId: number
): Promise<number> {
  const source = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM workouts WHERE id = ?;`,
    [sourceWorkoutId]
  );
  const newWorkoutId = await createWorkout(db, source?.name ?? "Workout");

  const exerciseRows = await db.getAllAsync<{ exercise_id: number; order_index: number }>(
    `SELECT exercise_id, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC;`,
    [sourceWorkoutId]
  );
  for (const row of exerciseRows) {
    await addExerciseToWorkout(db, newWorkoutId, row.exercise_id);
  }
  return newWorkoutId;
}

export async function addExerciseToWorkout(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number
): Promise<number> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?;`,
    [workoutId]
  );
  const orderIndex = countRow ? countRow.count : 0;
  const result = await db.runAsync(
    `INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?);`,
    [workoutId, exerciseId, orderIndex]
  );
  const weId = result.lastInsertRowId;
  // Pre-seed one empty set so the UI always has a row to fill in.
  await db.runAsync(
    `INSERT INTO sets (workout_exercise_id, set_number, weight, reps, completed, rest_seconds) VALUES (?, 1, 0, 0, 0, 90);`,
    [weId]
  );
  return weId;
}

export async function removeExerciseFromWorkout(
  db: SQLiteDatabase,
  workoutExerciseId: number
): Promise<void> {
  await db.runAsync(`DELETE FROM workout_exercises WHERE id = ?;`, [
    workoutExerciseId,
  ]);
}

export async function addSet(
  db: SQLiteDatabase,
  workoutExerciseId: number,
  defaultRestSeconds: number,
  copyFromLast = true
): Promise<number> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sets WHERE workout_exercise_id = ?;`,
    [workoutExerciseId]
  );
  const setNumber = (countRow?.count ?? 0) + 1;

  let weight = 0;
  let reps = 0;
  if (copyFromLast) {
    const last = await db.getFirstAsync<{ weight: number; reps: number }>(
      `SELECT weight, reps FROM sets WHERE workout_exercise_id = ? ORDER BY set_number DESC LIMIT 1;`,
      [workoutExerciseId]
    );
    if (last) {
      weight = last.weight;
      reps = last.reps;
    }
  }

  const result = await db.runAsync(
    `INSERT INTO sets (workout_exercise_id, set_number, weight, reps, completed, rest_seconds) VALUES (?, ?, ?, ?, 0, ?);`,
    [workoutExerciseId, setNumber, weight, reps, defaultRestSeconds]
  );
  return result.lastInsertRowId;
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  fields: Partial<Pick<SetEntry, "weight" | "reps" | "rpe" | "notes" | "completed" | "restSeconds">>
): Promise<void> {
  const clauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.weight !== undefined) {
    clauses.push("weight = ?");
    values.push(fields.weight);
  }
  if (fields.reps !== undefined) {
    clauses.push("reps = ?");
    values.push(fields.reps);
  }
  if (fields.rpe !== undefined) {
    clauses.push("rpe = ?");
    values.push(fields.rpe);
  }
  if (fields.notes !== undefined) {
    clauses.push("notes = ?");
    values.push(fields.notes);
  }
  if (fields.completed !== undefined) {
    clauses.push("completed = ?");
    values.push(fields.completed ? 1 : 0);
  }
  if (fields.restSeconds !== undefined) {
    clauses.push("rest_seconds = ?");
    values.push(fields.restSeconds);
  }
  if (clauses.length === 0) return;

  values.push(setId);
  await db.runAsync(`UPDATE sets SET ${clauses.join(", ")} WHERE id = ?;`, values);
}

export async function deleteSet(db: SQLiteDatabase, setId: number): Promise<void> {
  await db.runAsync(`DELETE FROM sets WHERE id = ?;`, [setId]);
}

export async function getWorkoutDetail(
  db: SQLiteDatabase,
  workoutId: number
): Promise<WorkoutDetail | null> {
  const workout = await db.getFirstAsync<{
    id: number;
    name: string;
    date: string;
    started_at: string;
    finished_at: string | null;
    notes: string | null;
  }>(`SELECT * FROM workouts WHERE id = ?;`, [workoutId]);
  if (!workout) return null;

  const weRows = await db.getAllAsync<{
    id: number;
    workout_id: number;
    exercise_id: number;
    order_index: number;
    notes: string | null;
    exercise_name: string;
    muscle_group: string;
    equipment: string;
  }>(
    `SELECT we.*, e.name as exercise_name, e.muscle_group, e.equipment
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.order_index ASC;`,
    [workoutId]
  );

  const exercises: WorkoutExerciseWithSets[] = [];
  let totalVolume = 0;
  let bestSet: { exerciseName: string; weight: number; reps: number } | null = null;

  for (const we of weRows) {
    const setRows = await db.getAllAsync<SetRow>(
      `SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number ASC;`,
      [we.id]
    );
    const sets = setRows.map(mapSet);
    for (const s of sets) {
      if (s.completed) {
        totalVolume += s.weight * s.reps;
        if (!bestSet || s.weight > bestSet.weight) {
          bestSet = { exerciseName: we.exercise_name, weight: s.weight, reps: s.reps };
        }
      }
    }
    exercises.push({
      id: we.id,
      workoutId: we.workout_id,
      exerciseId: we.exercise_id,
      orderIndex: we.order_index,
      notes: we.notes,
      exerciseName: we.exercise_name,
      muscleGroup: we.muscle_group as MuscleGroup,
      equipment: we.equipment,
      sets,
    });
  }

  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    startedAt: workout.started_at,
    finishedAt: workout.finished_at,
    notes: workout.notes,
    exercises,
    totalVolume,
    bestSet,
  };
}

export async function getWorkoutSummaries(
  db: SQLiteDatabase,
  limit = 100
): Promise<WorkoutSummary[]> {
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    date: string;
    started_at: string;
    finished_at: string | null;
  }>(
    `SELECT id, name, date, started_at, finished_at FROM workouts
     WHERE finished_at IS NOT NULL
     ORDER BY started_at DESC LIMIT ?;`,
    [limit]
  );

  const summaries: WorkoutSummary[] = [];
  for (const w of rows) {
    const agg = await db.getFirstAsync<{
      exercise_count: number;
      set_count: number;
      volume: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = ?) as exercise_count,
        (SELECT COUNT(*) FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id WHERE we.workout_id = ? AND s.completed = 1) as set_count,
        (SELECT COALESCE(SUM(s.weight * s.reps), 0) FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id WHERE we.workout_id = ? AND s.completed = 1) as volume;`,
      [w.id, w.id, w.id]
    );
    summaries.push({
      id: w.id,
      name: w.name,
      date: w.date,
      startedAt: w.started_at,
      finishedAt: w.finished_at,
      exerciseCount: agg?.exercise_count ?? 0,
      setCount: agg?.set_count ?? 0,
      totalVolume: agg?.volume ?? 0,
    });
  }
  return summaries;
}

export async function getLastFinishedWorkout(
  db: SQLiteDatabase
): Promise<WorkoutSummary | null> {
  const all = await getWorkoutSummaries(db, 1);
  return all[0] ?? null;
}

export async function getInProgressWorkout(
  db: SQLiteDatabase
): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM workouts WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1;`
  );
  return row ? row.id : null;
}

export async function getWeeklyWorkoutCount(db: SQLiteDatabase): Promise<number> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  const diffToMonday = (dayOfWeek + 6) % 7;
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayISO = monday.toISOString().slice(0, 10);

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workouts WHERE finished_at IS NOT NULL AND date >= ?;`,
    [mondayISO]
  );
  return row?.count ?? 0;
}

export async function getCurrentStreak(db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM workouts WHERE finished_at IS NOT NULL ORDER BY date DESC;`
  );
  if (rows.length === 0) return 0;

  const dateSet = new Set(rows.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If they haven't worked out today, streak can still count starting yesterday.
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!dateSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dStr = cursor.toISOString().slice(0, 10);
    if (dateSet.has(dStr)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Consecutive weeks (Sunday-start) with at least one finished workout. Unlike
 * a day-streak, a planned rest day doesn't break it — only a whole week with
 * no training does. */
export async function getCurrentWeekStreak(db: SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM workouts WHERE finished_at IS NOT NULL ORDER BY date DESC;`
  );
  if (rows.length === 0) return 0;

  const weekStart = (d: Date): string => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy.toISOString().slice(0, 10);
  };

  const weekSet = new Set(rows.map((r) => weekStart(new Date(`${r.date}T00:00:00`))));

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If the current week has no session yet, start counting from last week —
  // an in-progress week shouldn't zero out a streak still in motion.
  if (!weekSet.has(weekStart(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
  }

  let streak = 0;
  while (weekSet.has(weekStart(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export async function getTodaysWorkout(
  db: SQLiteDatabase
): Promise<WorkoutSummary | null> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM workouts WHERE date = ? ORDER BY started_at DESC LIMIT 1;`,
    [todayStr]
  );
  if (!row) return null;
  const all = await db.getAllAsync<{
    id: number;
    name: string;
    date: string;
    started_at: string;
    finished_at: string | null;
  }>(`SELECT id, name, date, started_at, finished_at FROM workouts WHERE id = ?;`, [
    row.id,
  ]);
  if (all.length === 0) return null;
  const w = all[0];
  const agg = await db.getFirstAsync<{
    exercise_count: number;
    set_count: number;
    volume: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = ?) as exercise_count,
      (SELECT COUNT(*) FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id WHERE we.workout_id = ? AND s.completed = 1) as set_count,
      (SELECT COALESCE(SUM(s.weight * s.reps), 0) FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id WHERE we.workout_id = ? AND s.completed = 1) as volume;`,
    [w.id, w.id, w.id]
  );
  return {
    id: w.id,
    name: w.name,
    date: w.date,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    exerciseCount: agg?.exercise_count ?? 0,
    setCount: agg?.set_count ?? 0,
    totalVolume: agg?.volume ?? 0,
  };
}

// ================= Personal Records =================

async function recomputePersonalRecordsForWorkout(
  db: SQLiteDatabase,
  workoutId: number
): Promise<void> {
  const completedSets = await db.getAllAsync<{
    exercise_id: number;
    weight: number;
    reps: number;
  }>(
    `SELECT we.exercise_id as exercise_id, s.weight as weight, s.reps as reps
     FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? AND s.completed = 1 AND s.weight > 0 AND s.reps > 0;`,
    [workoutId]
  );

  const bestByExercise = new Map<number, { weight: number; reps: number; est: number }>();
  for (const s of completedSets) {
    const est = epley1RM(s.weight, s.reps);
    const current = bestByExercise.get(s.exercise_id);
    if (!current || est > current.est) {
      bestByExercise.set(s.exercise_id, { weight: s.weight, reps: s.reps, est });
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  for (const [exerciseId, best] of bestByExercise.entries()) {
    const existing = await db.getFirstAsync<{ estimated_1rm: number }>(
      `SELECT estimated_1rm FROM personal_records WHERE exercise_id = ? ORDER BY estimated_1rm DESC LIMIT 1;`,
      [exerciseId]
    );
    if (!existing || best.est > existing.estimated_1rm) {
      await db.runAsync(
        `INSERT INTO personal_records (exercise_id, weight, reps, estimated_1rm, date, workout_id) VALUES (?, ?, ?, ?, ?, ?);`,
        [exerciseId, best.weight, best.reps, best.est, date, workoutId]
      );
    }
  }
}

export async function getRecentPersonalRecords(
  db: SQLiteDatabase,
  limit = 5
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<{
    id: number;
    exercise_id: number;
    weight: number;
    reps: number;
    estimated_1rm: number;
    date: string;
    workout_id: number;
    exercise_name: string;
  }>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     ORDER BY pr.date DESC, pr.id DESC LIMIT ?;`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    weight: r.weight,
    reps: r.reps,
    estimated1RM: r.estimated_1rm,
    date: r.date,
    workoutId: r.workout_id,
    exerciseName: r.exercise_name,
  }));
}

export async function getBestLiftPerExercise(
  db: SQLiteDatabase
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<{
    id: number;
    exercise_id: number;
    weight: number;
    reps: number;
    estimated_1rm: number;
    date: string;
    workout_id: number;
    exercise_name: string;
  }>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     WHERE pr.estimated_1rm = (
       SELECT MAX(pr2.estimated_1rm) FROM personal_records pr2 WHERE pr2.exercise_id = pr.exercise_id
     )
     GROUP BY pr.exercise_id
     ORDER BY e.name ASC;`
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    weight: r.weight,
    reps: r.reps,
    estimated1RM: r.estimated_1rm,
    date: r.date,
    workoutId: r.workout_id,
    exerciseName: r.exercise_name,
  }));
}

export async function getBestLiftByName(
  db: SQLiteDatabase,
  exerciseName: string
): Promise<PersonalRecord | null> {
  const row = await db.getFirstAsync<{
    id: number;
    exercise_id: number;
    weight: number;
    reps: number;
    estimated_1rm: number;
    date: string;
    workout_id: number;
    exercise_name: string;
  }>(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     WHERE e.name = ?
     ORDER BY pr.estimated_1rm DESC LIMIT 1;`,
    [exerciseName]
  );
  if (!row) return null;
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    weight: row.weight,
    reps: row.reps,
    estimated1RM: row.estimated_1rm,
    date: row.date,
    workoutId: row.workout_id,
    exerciseName: row.exercise_name,
  };
}

export async function getExerciseHistory(
  db: SQLiteDatabase,
  exerciseId: number
): Promise<ExerciseHistoryPoint[]> {
  const rows = await db.getAllAsync<{
    workout_id: number;
    date: string;
    max_weight: number;
    volume: number;
    best_reps: number;
  }>(
    `SELECT
      w.id as workout_id,
      w.date as date,
      MAX(s.weight) as max_weight,
      SUM(s.weight * s.reps) as volume,
      MAX(CASE WHEN s.weight = (SELECT MAX(s2.weight) FROM sets s2 JOIN workout_exercises we2 ON we2.id = s2.workout_exercise_id WHERE we2.id = we.id AND s2.completed = 1) THEN s.reps ELSE 0 END) as best_reps
     FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND s.completed = 1 AND w.finished_at IS NOT NULL
     GROUP BY w.id
     ORDER BY w.date ASC;`,
    [exerciseId]
  );
  return rows.map((r) => ({
    workoutId: r.workout_id,
    date: r.date,
    maxWeight: r.max_weight ?? 0,
    volume: r.volume ?? 0,
    bestReps: r.best_reps ?? 0,
    estimated1RM: epley1RM(r.max_weight ?? 0, r.best_reps ?? 0),
  }));
}

export async function getVolumeByWorkout(
  db: SQLiteDatabase,
  limit = 12
): Promise<{ date: string; volume: number }[]> {
  const rows = await db.getAllAsync<{ date: string; volume: number }>(
    `SELECT w.date as date, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id AND s.completed = 1
     WHERE w.finished_at IS NOT NULL
     GROUP BY w.id
     ORDER BY w.date ASC;`
  );
  return rows.slice(-limit);
}

// ================= Bodyweight =================

export async function addBodyweightEntry(
  db: SQLiteDatabase,
  weight: number,
  date?: string
): Promise<void> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  await db.runAsync(
    `INSERT INTO bodyweight_entries (date, weight) VALUES (?, ?);`,
    [d, weight]
  );
}

export async function getBodyweightEntries(
  db: SQLiteDatabase
): Promise<BodyweightEntry[]> {
  const rows = await db.getAllAsync<{ id: number; date: string; weight: number }>(
    `SELECT * FROM bodyweight_entries ORDER BY date ASC;`
  );
  return rows;
}

export async function getLatestBodyweight(
  db: SQLiteDatabase
): Promise<BodyweightEntry | null> {
  const row = await db.getFirstAsync<{ id: number; date: string; weight: number }>(
    `SELECT * FROM bodyweight_entries ORDER BY date DESC LIMIT 1;`
  );
  return row ?? null;
}

export async function deleteBodyweightEntry(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(`DELETE FROM bodyweight_entries WHERE id = ?;`, [id]);
}

// ================= Settings =================

export async function getSettings(db: SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<{
    id: number;
    units: string;
    default_rest_seconds: number;
    theme: string;
    accent_color: string;
    daily_calorie_goal: number;
    protein_goal_g: number;
    carb_goal_g: number;
    fat_goal_g: number;
    water_goal_ml: number;
    water_unit: string;
    tab_order: string | null;
  }>(`SELECT * FROM usersettings WHERE id = 1;`);
  if (!row) {
    return {
      id: 1,
      units: "lb",
      defaultRestSeconds: 90,
      theme: "dark",
      accentColor: "#FF6B35",
      dailyCalorieGoal: 2200,
      proteinGoalG: 150,
      carbGoalG: 220,
      fatGoalG: 70,
      waterGoalMl: 2500,
      waterUnit: "mL",
      tabOrder: normalizeTabOrder(null),
    };
  }
  let parsedTabOrder: string[] | null = null;
  if (row.tab_order) {
    try {
      parsedTabOrder = JSON.parse(row.tab_order);
    } catch {
      parsedTabOrder = null;
    }
  }
  return {
    id: row.id,
    units: row.units as "kg" | "lb",
    defaultRestSeconds: row.default_rest_seconds,
    theme: row.theme as "dark" | "light",
    accentColor: row.accent_color ?? "#FF6B35",
    dailyCalorieGoal: row.daily_calorie_goal ?? 2200,
    proteinGoalG: row.protein_goal_g ?? 150,
    carbGoalG: row.carb_goal_g ?? 220,
    fatGoalG: row.fat_goal_g ?? 70,
    waterGoalMl: row.water_goal_ml ?? 2500,
    waterUnit: (row.water_unit as UserSettings["waterUnit"]) ?? "mL",
    tabOrder: normalizeTabOrder(parsedTabOrder),
  };
}

export async function updateSettings(
  db: SQLiteDatabase,
  fields: Partial<
    Pick<
      UserSettings,
      | "units"
      | "defaultRestSeconds"
      | "theme"
      | "accentColor"
      | "dailyCalorieGoal"
      | "proteinGoalG"
      | "carbGoalG"
      | "fatGoalG"
      | "waterGoalMl"
      | "waterUnit"
      | "tabOrder"
    >
  >
): Promise<void> {
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (fields.tabOrder !== undefined) {
    clauses.push("tab_order = ?");
    values.push(JSON.stringify(fields.tabOrder));
  }
  if (fields.units !== undefined) {
    clauses.push("units = ?");
    values.push(fields.units);
  }
  if (fields.defaultRestSeconds !== undefined) {
    clauses.push("default_rest_seconds = ?");
    values.push(fields.defaultRestSeconds);
  }
  if (fields.theme !== undefined) {
    clauses.push("theme = ?");
    values.push(fields.theme);
  }
  if (fields.accentColor !== undefined) {
    clauses.push("accent_color = ?");
    values.push(fields.accentColor);
  }
  if (fields.dailyCalorieGoal !== undefined) {
    clauses.push("daily_calorie_goal = ?");
    values.push(fields.dailyCalorieGoal);
  }
  if (fields.proteinGoalG !== undefined) {
    clauses.push("protein_goal_g = ?");
    values.push(fields.proteinGoalG);
  }
  if (fields.carbGoalG !== undefined) {
    clauses.push("carb_goal_g = ?");
    values.push(fields.carbGoalG);
  }
  if (fields.waterUnit !== undefined) {
    clauses.push("water_unit = ?");
    values.push(fields.waterUnit);
  }
  if (fields.fatGoalG !== undefined) {
    clauses.push("fat_goal_g = ?");
    values.push(fields.fatGoalG);
  }
  if (fields.waterGoalMl !== undefined) {
    clauses.push("water_goal_ml = ?");
    values.push(fields.waterGoalMl);
  }
  if (clauses.length === 0) return;
  await db.runAsync(`UPDATE usersettings SET ${clauses.join(", ")} WHERE id = 1;`, values);
}

// ================= Workout Templates =================

interface TemplateExerciseRow {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  notes: string | null;
  sticky_note: string | null;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
}

interface TemplateSetRow {
  id: number;
  template_exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  is_warmup: number;
}

function mapTemplateExercise(row: TemplateExerciseRow): TemplateExercise {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    targetSets: row.target_sets,
    notes: row.notes,
    stickyNote: row.sticky_note,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment,
  };
}

function mapTemplateSet(row: TemplateSetRow): TemplateSet {
  return {
    id: row.id,
    templateExerciseId: row.template_exercise_id,
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
    isWarmup: !!row.is_warmup,
  };
}

export async function createTemplate(
  db: SQLiteDatabase,
  name: string
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO workout_templates (name, created_at) VALUES (?, ?);`,
    [name, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function renameTemplate(
  db: SQLiteDatabase,
  templateId: number,
  name: string
): Promise<void> {
  await db.runAsync(`UPDATE workout_templates SET name = ? WHERE id = ?;`, [name, templateId]);
}

export async function deleteTemplate(
  db: SQLiteDatabase,
  templateId: number
): Promise<void> {
  await db.runAsync(`DELETE FROM workout_templates WHERE id = ?;`, [templateId]);
}

export async function getTemplates(db: SQLiteDatabase): Promise<WorkoutTemplate[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; created_at: string }>(
    `SELECT * FROM workout_templates ORDER BY created_at DESC;`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function getTemplateDetail(
  db: SQLiteDatabase,
  templateId: number
): Promise<WorkoutTemplateDetail | null> {
  const template = await db.getFirstAsync<{ id: number; name: string; created_at: string }>(
    `SELECT * FROM workout_templates WHERE id = ?;`,
    [templateId]
  );
  if (!template) return null;

  const exerciseRows = await db.getAllAsync<TemplateExerciseRow>(
    `SELECT te.*, e.name as exercise_name, e.muscle_group, e.equipment
     FROM template_exercises te
     JOIN exercises e ON e.id = te.exercise_id
     WHERE te.template_id = ?
     ORDER BY te.order_index ASC;`,
    [templateId]
  );

  const exercises: TemplateExerciseWithSets[] = [];
  for (const te of exerciseRows) {
    const setRows = await db.getAllAsync<TemplateSetRow>(
      `SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number ASC;`,
      [te.id]
    );
    exercises.push({ ...mapTemplateExercise(te), sets: setRows.map(mapTemplateSet) });
  }

  return {
    id: template.id,
    name: template.name,
    createdAt: template.created_at,
    exercises,
  };
}

export async function addExerciseToTemplate(
  db: SQLiteDatabase,
  templateId: number,
  exerciseId: number
): Promise<number> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM template_exercises WHERE template_id = ?;`,
    [templateId]
  );
  const orderIndex = countRow ? countRow.count : 0;
  const result = await db.runAsync(
    `INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets) VALUES (?, ?, ?, 1);`,
    [templateId, exerciseId, orderIndex]
  );
  const templateExerciseId = result.lastInsertRowId;
  await db.runAsync(
    `INSERT INTO template_sets (template_exercise_id, set_number, weight, reps, is_warmup) VALUES (?, 1, 0, 0, 0);`,
    [templateExerciseId]
  );
  return templateExerciseId;
}

export async function removeExerciseFromTemplate(
  db: SQLiteDatabase,
  templateExerciseId: number
): Promise<void> {
  await db.runAsync(`DELETE FROM template_exercises WHERE id = ?;`, [templateExerciseId]);
}

export async function replaceTemplateExercise(
  db: SQLiteDatabase,
  templateExerciseId: number,
  newExerciseId: number
): Promise<void> {
  await db.runAsync(`UPDATE template_exercises SET exercise_id = ? WHERE id = ?;`, [
    newExerciseId,
    templateExerciseId,
  ]);
}

export async function updateTemplateExerciseNotes(
  db: SQLiteDatabase,
  templateExerciseId: number,
  notes: string | null
): Promise<void> {
  await db.runAsync(`UPDATE template_exercises SET notes = ? WHERE id = ?;`, [
    notes,
    templateExerciseId,
  ]);
}

export async function updateTemplateExerciseStickyNote(
  db: SQLiteDatabase,
  templateExerciseId: number,
  stickyNote: string | null
): Promise<void> {
  await db.runAsync(`UPDATE template_exercises SET sticky_note = ? WHERE id = ?;`, [
    stickyNote,
    templateExerciseId,
  ]);
}

export async function addTemplateSet(
  db: SQLiteDatabase,
  templateExerciseId: number
): Promise<number> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM template_sets WHERE template_exercise_id = ?;`,
    [templateExerciseId]
  );
  const setNumber = (countRow?.count ?? 0) + 1;
  const last = await db.getFirstAsync<{ weight: number; reps: number }>(
    `SELECT weight, reps FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number DESC LIMIT 1;`,
    [templateExerciseId]
  );
  const result = await db.runAsync(
    `INSERT INTO template_sets (template_exercise_id, set_number, weight, reps, is_warmup) VALUES (?, ?, ?, ?, 0);`,
    [templateExerciseId, setNumber, last?.weight ?? 0, last?.reps ?? 0]
  );
  return result.lastInsertRowId;
}

/**
 * Adds a warm-up set that sorts above the working sets. Uses a set_number
 * lower than any existing row (rather than renumbering everything) so
 * insertion order stays correct with a single write.
 */
export async function addWarmupTemplateSet(
  db: SQLiteDatabase,
  templateExerciseId: number
): Promise<number> {
  const min = await db.getFirstAsync<{ min_number: number }>(
    `SELECT MIN(set_number) as min_number FROM template_sets WHERE template_exercise_id = ?;`,
    [templateExerciseId]
  );
  const setNumber = (min?.min_number ?? 1) - 1;
  const result = await db.runAsync(
    `INSERT INTO template_sets (template_exercise_id, set_number, weight, reps, is_warmup) VALUES (?, ?, 0, 8, 1);`,
    [templateExerciseId, setNumber]
  );
  return result.lastInsertRowId;
}

export async function updateTemplateSet(
  db: SQLiteDatabase,
  templateSetId: number,
  fields: Partial<Pick<TemplateSet, "weight" | "reps">>
): Promise<void> {
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (fields.weight !== undefined) {
    clauses.push("weight = ?");
    values.push(fields.weight);
  }
  if (fields.reps !== undefined) {
    clauses.push("reps = ?");
    values.push(fields.reps);
  }
  if (clauses.length === 0) return;
  values.push(templateSetId);
  await db.runAsync(`UPDATE template_sets SET ${clauses.join(", ")} WHERE id = ?;`, values);
}

export async function deleteTemplateSet(
  db: SQLiteDatabase,
  templateSetId: number
): Promise<void> {
  await db.runAsync(`DELETE FROM template_sets WHERE id = ?;`, [templateSetId]);
}

/**
 * Starts a new in-progress workout pre-populated with the template's
 * exercises, each seeded with its exact planned weight/reps per set.
 */
export async function startWorkoutFromTemplate(
  db: SQLiteDatabase,
  templateId: number,
  defaultRestSeconds: number
): Promise<number> {
  const detail = await getTemplateDetail(db, templateId);
  const workoutId = await createWorkout(db, detail?.name ?? "Workout");
  if (!detail) return workoutId;

  for (const te of detail.exercises) {
    const workoutExerciseId = await addExerciseToWorkout(db, workoutId, te.exerciseId);
    if (te.sets.length === 0) continue;
    // addExerciseToWorkout pre-seeds one empty set; fill it in with the first planned set.
    const [first, ...rest] = te.sets;
    await updateSet(db, (await getWorkoutDetailFirstSetId(db, workoutExerciseId)) ?? -1, {
      weight: first.weight,
      reps: first.reps,
    });
    for (const s of rest) {
      const setId = await addSet(db, workoutExerciseId, defaultRestSeconds, false);
      await updateSet(db, setId, { weight: s.weight, reps: s.reps });
    }
  }
  return workoutId;
}

async function getWorkoutDetailFirstSetId(
  db: SQLiteDatabase,
  workoutExerciseId: number
): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM sets WHERE workout_exercise_id = ? ORDER BY set_number ASC LIMIT 1;`,
    [workoutExerciseId]
  );
  return row?.id ?? null;
}

// ================= Data wipe (used by import) =================

export async function wipeAllData(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM sets;
    DELETE FROM workout_exercises;
    DELETE FROM personal_records;
    DELETE FROM workouts;
    DELETE FROM bodyweight_entries;
    DELETE FROM template_sets;
    DELETE FROM template_exercises;
    DELETE FROM workout_templates;
    DELETE FROM nutrition_entries;
    DELETE FROM meal_items;
    DELETE FROM meals;
    DELETE FROM daily_logs;
  `);
}
