export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Arms"
  | "Core"
  | "Cardio"
  | "Other";

export type WeightUnit = "kg" | "lb";

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  isCustom: boolean;
  isFavorite: boolean;
}

export interface Workout {
  id: number;
  name: string;
  date: string; // ISO date (YYYY-MM-DD)
  startedAt: string; // ISO datetime
  finishedAt: string | null; // ISO datetime
  notes: string | null;
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  orderIndex: number;
  notes: string | null;
  // joined
  exerciseName?: string;
  muscleGroup?: MuscleGroup;
  equipment?: string;
}

export interface SetEntry {
  id: number;
  workoutExerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  notes: string | null;
  completed: boolean;
  restSeconds: number;
}

export interface PersonalRecord {
  id: number;
  exerciseId: number;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
  workoutId: number;
  // joined
  exerciseName?: string;
}

export interface BodyweightEntry {
  id: number;
  date: string; // ISO date
  weight: number;
}

export interface UserSettings {
  id: number;
  units: WeightUnit;
  defaultRestSeconds: number;
  theme: "dark" | "light";
  accentColor: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  createdAt: string;
}

export interface TemplateExercise {
  id: number;
  templateId: number;
  exerciseId: number;
  orderIndex: number;
  targetSets: number;
  notes: string | null;
  stickyNote: string | null;
  // joined
  exerciseName?: string;
  muscleGroup?: MuscleGroup;
  equipment?: string;
}

export interface TemplateSet {
  id: number;
  templateExerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
}

export interface TemplateExerciseWithSets extends TemplateExercise {
  sets: TemplateSet[];
}

export interface WorkoutTemplateDetail extends WorkoutTemplate {
  exercises: TemplateExerciseWithSets[];
}

// Composite / derived view types used across the UI

export interface WorkoutExerciseWithSets extends WorkoutExercise {
  sets: SetEntry[];
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExerciseWithSets[];
  totalVolume: number;
  bestSet: { exerciseName: string; weight: number; reps: number } | null;
}

export interface WorkoutSummary {
  id: number;
  name: string;
  date: string;
  startedAt: string;
  finishedAt: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

export interface ExerciseHistoryPoint {
  workoutId: number;
  date: string;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
  bestReps: number;
}
