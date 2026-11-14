// Turns a user's graded analyses into dashboard numbers. Pure functions, so
// they're easy to test.
import { exerciseLabel } from "./exercises";
import { averageGrade, gradeChange, GRADE_POINTS, type Grade } from "./grades";

export interface ProgressInput {
  id: string;
  createdAt: Date;
  exercise: string;
  exerciseKey: string;
  grade: Grade;
}

export interface ProgressPoint {
  id: string;
  date: string;
  grade: Grade;
  exercise: string;
}

export interface ExerciseProgress {
  key: string;
  label: string;
  count: number;
  /** Oldest first. */
  points: ProgressPoint[];
  first: ProgressPoint;
  latest: ProgressPoint;
  best: Grade;
  /** Grade points gained from the first to the latest session (C -> A is +2). */
  change: number;
}

export interface ProgressSummary {
  total: number;
  last7Days: number;
  /** Average grade over the last 30 days, or null if there were no sessions. */
  recentAverage: Grade | null;
  /** The lift with the biggest gain from first to latest session, if any improved. */
  mostImproved: ExerciseProgress | null;
  /** Most recently trained first. */
  exercises: ExerciseProgress[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarizeProgress(entries: readonly ProgressInput[], now: Date = new Date()): ProgressSummary {
  const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const since = (days: number) => sorted.filter((e) => now.getTime() - e.createdAt.getTime() <= days * DAY_MS);

  const groups = new Map<string, ProgressInput[]>();
  for (const entry of sorted) {
    const group = groups.get(entry.exerciseKey);
    if (group) group.push(entry);
    else groups.set(entry.exerciseKey, [entry]);
  }

  const exercises: ExerciseProgress[] = [...groups.entries()].map(([key, group]) => {
    const points = group.map((e) => ({ id: e.id, date: e.createdAt.toISOString(), grade: e.grade, exercise: e.exercise }));
    const first = points[0]!;
    const latest = points[points.length - 1]!;
    return {
      key,
      label: exerciseLabel(key, latest.exercise),
      count: points.length,
      points,
      first,
      latest,
      best: points.reduce((best, p) => (GRADE_POINTS[p.grade] > GRADE_POINTS[best] ? p.grade : best), first.grade),
      change: gradeChange(first.grade, latest.grade),
    };
  });
  exercises.sort((a, b) => b.latest.date.localeCompare(a.latest.date));

  const improved = exercises.filter((e) => e.count > 1 && e.change > 0);
  const mostImproved = improved.length
    ? improved.reduce((top, e) => (e.change > top.change || (e.change === top.change && e.count > top.count) ? e : top))
    : null;

  return {
    total: sorted.length,
    last7Days: since(7).length,
    recentAverage: averageGrade(since(30).map((e) => e.grade)),
    mostImproved,
    exercises,
  };
}
