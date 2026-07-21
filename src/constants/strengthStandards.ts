/**
 * Approximate, hand-authored bodyweight-multiplier strength standards inspired
 * by commonly-cited general benchmarks (à la Strength Level / Symmetric
 * Strength calculators). These are NOT sourced from a verified published
 * dataset — they're a motivational estimate, not a clinical or official
 * standard. Surfaced to the user as such wherever they're shown.
 */

export type BodyRegion =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "abs";

export const GRADABLE_REGIONS: Exclude<BodyRegion, "abs">[] = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
];

/** The exercise (must match a `name` in SEED_EXERCISES exactly) whose best
 * logged lift represents each region for grading purposes. */
export const REGION_EXERCISE: Record<Exclude<BodyRegion, "abs">, string> = {
  chest: "Bench Press",
  shoulders: "Overhead Press",
  biceps: "Barbell Curl",
  triceps: "Skull Crushers",
  back: "Deadlift",
  glutes: "Hip Thrust",
  quads: "Squat",
  hamstrings: "Romanian Deadlift",
  calves: "Standing Calf Raise",
};

export const REGION_LABELS: Record<BodyRegion, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  back: "Back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  abs: "Abs",
};

export const STRENGTH_TIERS = [
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
  "World Class",
] as const;

export type Sex = "male" | "female";

// Ordered Beginner -> World Class, matching STRENGTH_TIERS.
export const TIER_COLORS: string[] = [
  "#8C8C94", // Beginner
  "#4B9FFF", // Novice
  "#3DDC84", // Intermediate
  "#FFC24B", // Advanced
  "#FF8A3D", // Elite
  "#C77DFF", // World Class
];

// Each array is 6 ascending bodyweight-multiplier thresholds, one per tier.
export const STANDARDS: Record<Exclude<BodyRegion, "abs">, Record<Sex, number[]>> = {
  chest: {
    male: [0.5, 0.75, 1.0, 1.5, 1.75, 2.2],
    female: [0.3, 0.45, 0.6, 0.85, 1.0, 1.3],
  },
  shoulders: {
    male: [0.35, 0.5, 0.7, 0.9, 1.1, 1.4],
    female: [0.2, 0.3, 0.4, 0.55, 0.7, 0.9],
  },
  biceps: {
    male: [0.2, 0.3, 0.4, 0.55, 0.7, 0.9],
    female: [0.125, 0.2, 0.275, 0.35, 0.45, 0.6],
  },
  triceps: {
    male: [0.25, 0.35, 0.45, 0.6, 0.75, 0.95],
    female: [0.15, 0.225, 0.3, 0.4, 0.5, 0.65],
  },
  back: {
    male: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0],
    female: [0.8, 1.0, 1.25, 1.65, 2.0, 2.5],
  },
  glutes: {
    male: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
    female: [0.9, 1.25, 1.75, 2.25, 2.75, 3.25],
  },
  quads: {
    male: [0.75, 1.0, 1.25, 1.75, 2.0, 2.5],
    female: [0.6, 0.8, 1.0, 1.4, 1.65, 2.0],
  },
  hamstrings: {
    male: [0.75, 1.0, 1.25, 1.75, 2.0, 2.5],
    female: [0.6, 0.8, 1.0, 1.4, 1.65, 2.0],
  },
  calves: {
    male: [0.75, 1.25, 1.75, 2.25, 2.75, 3.25],
    female: [0.6, 1.0, 1.4, 1.8, 2.2, 2.6],
  },
};

/** Returns the highest tier index (0 = Beginner .. 5 = World Class) whose
 * threshold the ratio clears, or -1 if it's below even Beginner. */
export function getStrengthTier(ratio: number, thresholds: number[]): number {
  let tier = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) tier = i;
  }
  return tier;
}
