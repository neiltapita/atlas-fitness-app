export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS usersettings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  units TEXT NOT NULL DEFAULT 'lb',
  default_rest_seconds INTEGER NOT NULL DEFAULT 90,
  theme TEXT NOT NULL DEFAULT 'dark',
  accent_color TEXT NOT NULL DEFAULT '#D4AF37'
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe REAL,
  notes TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER NOT NULL DEFAULT 90
);

CREATE TABLE IF NOT EXISTS personal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  estimated_1rm REAL NOT NULL,
  date TEXT NOT NULL,
  workout_id INTEGER NOT NULL REFERENCES workouts(id)
);

CREATE TABLE IF NOT EXISTS bodyweight_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  sticky_note TEXT
);

CREATE TABLE IF NOT EXISTS template_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_exercise_id INTEGER NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  is_warmup INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand_id INTEGER REFERENCES food_brands(id),
  serving_size REAL NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id INTEGER NOT NULL REFERENCES foods(id),
  quantity REAL NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nutrition_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'snack',
  food_id INTEGER REFERENCES foods(id),
  meal_id INTEGER REFERENCES meals(id),
  quantity REAL NOT NULL DEFAULT 1,
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  water_ml INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_bodyweight_date ON bodyweight_entries(date);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sets_template_exercise ON template_sets(template_exercise_id);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_date ON nutrition_entries(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
`;

/**
 * Column additions to existing tables, applied after SCHEMA_SQL. Each is run
 * individually and duplicate-column errors are swallowed, since SQLite has
 * no "ADD COLUMN IF NOT EXISTS" and installs from before this column existed
 * need to pick it up without wiping the database.
 */
export const MIGRATIONS_SQL: string[] = [
  `ALTER TABLE usersettings ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#FF6B35';`,
  `ALTER TABLE template_exercises ADD COLUMN notes TEXT;`,
  `ALTER TABLE template_exercises ADD COLUMN sticky_note TEXT;`,
  `ALTER TABLE usersettings ADD COLUMN daily_calorie_goal INTEGER NOT NULL DEFAULT 2200;`,
  `ALTER TABLE usersettings ADD COLUMN protein_goal_g INTEGER NOT NULL DEFAULT 150;`,
  `ALTER TABLE usersettings ADD COLUMN carb_goal_g INTEGER NOT NULL DEFAULT 220;`,
  `ALTER TABLE usersettings ADD COLUMN fat_goal_g INTEGER NOT NULL DEFAULT 70;`,
  `ALTER TABLE usersettings ADD COLUMN water_goal_ml INTEGER NOT NULL DEFAULT 2500;`,
  `ALTER TABLE usersettings ADD COLUMN water_unit TEXT NOT NULL DEFAULT 'mL';`,
  `ALTER TABLE usersettings ADD COLUMN tab_order TEXT;`,
  // Atlas rebrand: move installs still on the old default orange accent to
  // the new gold brand color. Anyone who picked a different accent already
  // keeps their choice.
  `UPDATE usersettings SET accent_color = '#D4AF37' WHERE id = 1 AND accent_color = '#FF6B35';`,
];
