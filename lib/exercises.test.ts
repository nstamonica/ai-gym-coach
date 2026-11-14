import { describe, expect, it } from "vitest";
import { EXERCISE_KEYS, exerciseAbbreviation, exerciseLabel, groupKey, isExerciseKey, slugify } from "./exercises";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Cable Fly (single arm)")).toBe("cable-fly-single-arm");
  });

  it("strips accents and trims dashes", () => {
    expect(slugify("  Élévation latérale!! ")).toBe("elevation-laterale");
  });

  it("caps the length without leaving a trailing dash", () => {
    const slug = slugify("a ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("groupKey", () => {
  it("keeps known exercise keys", () => {
    expect(groupKey("back_squat", "High-bar back squat")).toBe("back_squat");
  });

  it("groups 'other' exercises by their name", () => {
    expect(groupKey("other", "Cable Fly")).toBe("custom:cable-fly");
    expect(groupKey("other", "cable fly")).toBe("custom:cable-fly");
  });

  it("treats unknown keys like 'other'", () => {
    expect(groupKey("made_up_key", "Sled Push")).toBe("custom:sled-push");
  });

  it("falls back to 'other' when there's no usable name", () => {
    expect(groupKey("other", "  !!  ")).toBe("other");
  });
});

describe("exerciseLabel", () => {
  it("uses the canonical label for known keys", () => {
    expect(exerciseLabel("bench_press", "Paused bench")).toBe("Bench press");
  });

  it("uses the model's own name for custom groups", () => {
    expect(exerciseLabel("custom:cable-fly", "Cable fly")).toBe("Cable fly");
  });

  it("derives a label from the slug when no name is given", () => {
    expect(exerciseLabel("custom:sled-push")).toBe("Sled push");
  });
});

describe("exerciseAbbreviation", () => {
  it("uses gym shorthand for known lifts", () => {
    expect(exerciseAbbreviation("back_squat", "High-bar back squat")).toBe("SQ");
    expect(exerciseAbbreviation("overhead_press")).toBe("OHP");
  });

  it("has a short, unique abbreviation for every known lift", () => {
    const abbreviations = EXERCISE_KEYS.filter((key) => key !== "other").map((key) => exerciseAbbreviation(key));
    expect(new Set(abbreviations).size).toBe(abbreviations.length);
    for (const abbreviation of abbreviations) expect(abbreviation.length).toBeLessThanOrEqual(5);
  });

  it("uses the initials of custom exercise names", () => {
    expect(exerciseAbbreviation("custom:cable-fly", "Cable fly")).toBe("CF");
    expect(exerciseAbbreviation("other", "Single-arm landmine press (kneeling)")).toBe("SAL");
  });

  it("falls back to a dash when there's nothing to abbreviate", () => {
    expect(exerciseAbbreviation("other", "")).toBe("—");
  });
});

describe("isExerciseKey", () => {
  it("rejects inherited object properties", () => {
    expect(isExerciseKey("toString")).toBe(false);
    expect(isExerciseKey("deadlift")).toBe(true);
  });
});
