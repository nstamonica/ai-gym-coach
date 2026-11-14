// Canonical exercise keys. The model picks one for every analysis so that the
// same lift is grouped together over time, even when its free-text name varies
// ("Back squat", "High-bar back squat", ...). Anything else is stored as
// `custom:<slug>` so it still groups consistently.

export const EXERCISES = {
  back_squat: "Back squat",
  front_squat: "Front squat",
  goblet_squat: "Goblet squat",
  bodyweight_squat: "Bodyweight squat",
  split_squat: "Split squat",
  lunge: "Lunge",
  leg_press: "Leg press",
  deadlift: "Deadlift",
  sumo_deadlift: "Sumo deadlift",
  romanian_deadlift: "Romanian deadlift",
  hip_thrust: "Hip thrust",
  kettlebell_swing: "Kettlebell swing",
  bench_press: "Bench press",
  incline_bench_press: "Incline bench press",
  dumbbell_bench_press: "Dumbbell bench press",
  push_up: "Push-up",
  overhead_press: "Overhead press",
  dip: "Dip",
  barbell_row: "Barbell row",
  dumbbell_row: "Dumbbell row",
  pull_up: "Pull-up",
  lat_pulldown: "Lat pulldown",
  clean: "Clean",
  snatch: "Snatch",
  other: "Other",
} as const;

export type ExerciseKey = keyof typeof EXERCISES;

export const EXERCISE_KEYS = Object.keys(EXERCISES) as ExerciseKey[];

const CUSTOM_PREFIX = "custom:";

export function isExerciseKey(value: unknown): value is ExerciseKey {
  return typeof value === "string" && Object.hasOwn(EXERCISES, value);
}

/** "Cable Fly (single arm)" -> "cable-fly-single-arm" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "é" decomposes to "e" + a combining mark
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/**
 * The key an analysis is grouped under: a known exercise key, or
 * `custom:<slug>` for exercises outside the list.
 */
export function groupKey(key: unknown, exerciseName: string): string {
  if (isExerciseKey(key) && key !== "other") return key;
  const slug = slugify(exerciseName);
  return slug ? `${CUSTOM_PREFIX}${slug}` : "other";
}

/** A display label for a group key; custom groups fall back to the model's own name. */
export function exerciseLabel(key: string, fallbackName = ""): string {
  if (isExerciseKey(key)) return EXERCISES[key];
  if (key.startsWith(CUSTOM_PREFIX)) {
    if (fallbackName) return fallbackName;
    const words = key.slice(CUSTOM_PREFIX.length).replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return fallbackName || "Exercise";
}
