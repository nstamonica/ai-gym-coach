import { describe, expect, it } from "vitest";
import { averageGrade, gradeChange, isGrade } from "./grades";

describe("averageGrade", () => {
  it("returns null with no grades", () => {
    expect(averageGrade([])).toBeNull();
  });

  it("rounds to the nearest grade", () => {
    expect(averageGrade(["A", "A", "C"])).toBe("B"); // 3.33
    expect(averageGrade(["D", "F", "F"])).toBe("F"); // 0.33
  });

  it("rounds exact halves up", () => {
    expect(averageGrade(["B", "C"])).toBe("B"); // 2.5
  });
});

describe("gradeChange", () => {
  it("is positive when the grade improves", () => {
    expect(gradeChange("C", "A")).toBe(2);
    expect(gradeChange("A", "D")).toBe(-3);
    expect(gradeChange("B", "B")).toBe(0);
  });
});

describe("isGrade", () => {
  it("accepts only A, B, C, D and F", () => {
    expect(isGrade("A")).toBe(true);
    expect(isGrade("E")).toBe(false);
    expect(isGrade("a")).toBe(false);
    expect(isGrade(null)).toBe(false);
  });
});
