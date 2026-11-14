export const GRADES = ["A", "B", "C", "D", "F"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_POINTS: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export const GRADE_LABELS: Record<Grade, string> = {
  A: "Excellent",
  B: "Solid",
  C: "Needs work",
  D: "Injury risk",
  F: "Unsafe",
};

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && (GRADES as readonly string[]).includes(value);
}

/** The grade closest to a GPA-style average (A = 4 ... F = 0), or null if there are none. */
export function averageGrade(grades: readonly Grade[]): Grade | null {
  if (grades.length === 0) return null;
  const mean = grades.reduce((sum, g) => sum + GRADE_POINTS[g], 0) / grades.length;
  return GRADES.reduce((best, g) =>
    Math.abs(GRADE_POINTS[g] - mean) < Math.abs(GRADE_POINTS[best] - mean) ? g : best,
  );
}

/** Positive when `to` is better than `from`: C -> A is +2. */
export function gradeChange(from: Grade, to: Grade): number {
  return GRADE_POINTS[to] - GRADE_POINTS[from];
}
