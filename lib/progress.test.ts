import { describe, expect, it } from "vitest";
import type { Grade } from "./grades";
import { summarizeProgress, type ProgressInput } from "./progress";

const NOW = new Date("2026-11-13T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

let n = 0;
const entry = (exerciseKey: string, grade: Grade, days: number, exercise = ""): ProgressInput => ({
  id: `a${++n}`,
  createdAt: daysAgo(days),
  exercise,
  exerciseKey,
  grade,
});

describe("summarizeProgress", () => {
  it("handles a user with no graded analyses", () => {
    expect(summarizeProgress([], NOW)).toEqual({
      total: 0,
      last7Days: 0,
      recentAverage: null,
      mostImproved: null,
      exercises: [],
    });
  });

  it("groups by lift, oldest first within a lift, most recently trained lift first", () => {
    const summary = summarizeProgress(
      [entry("deadlift", "C", 10), entry("back_squat", "B", 20), entry("back_squat", "A", 2), entry("deadlift", "B", 5)],
      NOW,
    );
    expect(summary.exercises.map((e) => e.key)).toEqual(["back_squat", "deadlift"]);
    const squat = summary.exercises[0]!;
    expect(squat.points.map((p) => p.grade)).toEqual(["B", "A"]);
    expect(squat).toMatchObject({ label: "Back squat", count: 2, best: "A", change: 1 });
  });

  it("counts recent sessions and averages the last 30 days only", () => {
    const summary = summarizeProgress(
      [
        entry("bench_press", "F", 60),
        entry("bench_press", "A", 3),
        entry("bench_press", "B", 12),
        entry("bench_press", "B", 20),
      ],
      NOW,
    );
    expect(summary.total).toBe(4);
    expect(summary.last7Days).toBe(1);
    expect(summary.recentAverage).toBe("B"); // A, B, B = 3.33; the F is older than 30 days
  });

  it("picks the lift with the biggest gain as most improved", () => {
    const summary = summarizeProgress(
      [
        entry("back_squat", "C", 30),
        entry("back_squat", "B", 1),
        entry("deadlift", "D", 30),
        entry("deadlift", "B", 2),
        entry("overhead_press", "A", 4), // a single session can't be "improved"
      ],
      NOW,
    );
    expect(summary.mostImproved?.key).toBe("deadlift");
  });

  it("reports no most-improved lift when nothing got better", () => {
    const summary = summarizeProgress([entry("dip", "A", 10), entry("dip", "B", 1)], NOW);
    expect(summary.mostImproved).toBeNull();
  });

  it("labels custom exercises with the model's name", () => {
    const summary = summarizeProgress([entry("custom:sled-push", "B", 1, "Sled push")], NOW);
    expect(summary.exercises[0]!.label).toBe("Sled push");
  });
});
