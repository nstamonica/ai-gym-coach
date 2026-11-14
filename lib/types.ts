// Data shapes the server sends to the UI. They never include user ids, Gemini
// file names or thumbnail bytes.
import type { Feedback } from "./analysis";
import type { Grade } from "./grades";

export interface AnalysisView {
  id: string;
  createdAt: string;
  isExercise: boolean;
  /** The model's specific name, e.g. "High-bar back squat". */
  exercise: string;
  /** The group it's tracked under, e.g. "back_squat". */
  exerciseKey: string;
  /** Display name of the group, e.g. "Back squat". */
  exerciseLabel: string;
  grade: Grade | null;
  feedback: Feedback;
  notes: string | null;
  videoName: string;
  videoSeconds: number | null;
  model: string | null;
  hasThumbnail: boolean;
  shareToken: string | null;
}

/** One row in the history list. */
export interface AnalysisSummary {
  id: string;
  createdAt: string;
  isExercise: boolean;
  exercise: string;
  exerciseKey: string;
  exerciseLabel: string;
  grade: Grade | null;
  summary: string;
  hasThumbnail: boolean;
}

/** The lifter's previous result for the same exercise, for "compared to last time". */
export interface PreviousResult {
  id: string;
  createdAt: string;
  grade: Grade;
}

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
  /** When the oldest counted analysis drops out of the 24-hour window. */
  nextSlotAt: string | null;
}
