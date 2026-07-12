/**
 * Epley formula: a widely used estimator for 1-rep max from a submaximal set.
 * For reps <= 1 it just returns the weight itself.
 */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateVolume(sets: { weight: number; reps: number; completed: boolean }[]): number {
  return sets.reduce((sum, s) => (s.completed ? sum + s.weight * s.reps : sum), 0);
}

export function bestSetOf(
  sets: { weight: number; reps: number; completed: boolean }[]
): { weight: number; reps: number } | null {
  const completed = sets.filter((s) => s.completed && s.weight > 0);
  if (completed.length === 0) return null;
  return completed.reduce((best, s) => (s.weight > best.weight ? s : best), completed[0]);
}

export function formatWeight(weight: number, unit: "kg" | "lb"): string {
  const rounded = Math.round(weight * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}

export function formatDuration(startISO: string, endISO?: string | null): string {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Digital-clock style elapsed time (mm:ss, or hh:mm:ss past an hour) for the
 * live in-workout timer.
 */
export function formatClock(startISO: string, endISO?: string | null): string {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}
