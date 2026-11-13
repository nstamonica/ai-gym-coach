// The shape of a form analysis, shared by the API route and the UI.

export const GRADES = ["A", "B", "C", "D", "F"] as const;
export type Grade = (typeof GRADES)[number];

export interface Tip {
  title: string;
  detail: string;
}

export interface Analysis {
  isExercise: boolean;
  exercise: string;
  grade: Grade;
  summary: string;
  strengths: string[];
  tips: Tip[];
  safetyWarning: string;
  cameraTip: string;
}

export const SYSTEM_INSTRUCTION = `You are an experienced strength and conditioning coach reviewing a short video of someone training.

- Base every comment on what is visible in the video. Refer to the phase of the movement (setup, descent, bottom, ascent, lockout) or a timestamp (m:ss) when it helps.
- Lead with anything that carries injury risk, then the changes that will help most.
- Be encouraging and plain-spoken. No jargon without a short explanation.
- Never invent details. If the camera angle, lighting or framing hides something important, say so instead of guessing.
- You are not a doctor. Don't diagnose injuries or pain.`;

export const ANALYSIS_PROMPT = `Review the exercise in this video.

Grade the form using this scale:
- A: excellent; only minor refinements
- B: solid; a few fixable issues
- C: noticeable breakdowns that will limit progress
- D: significant issues with a real injury risk under load
- F: dangerous; stop and fix before continuing

If the video does not show a person performing an exercise, set isExercise to false, explain briefly in the summary, and leave the other text fields and lists empty (use grade "C").`;

// JSON Schema passed to Gemini so the response is always valid, structured JSON.
export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    isExercise: {
      type: "boolean",
      description: "True if the video shows a person performing an exercise.",
    },
    exercise: {
      type: "string",
      description: "Specific name of the exercise, e.g. 'Barbell back squat'. Empty if not an exercise.",
    },
    grade: { type: "string", enum: [...GRADES] },
    summary: {
      type: "string",
      description: "One or two sentences on the overall quality of the set.",
    },
    strengths: {
      type: "array",
      description: "Up to 3 things the lifter is doing well.",
      items: { type: "string" },
      maxItems: 3,
    },
    tips: {
      type: "array",
      description: "The 3 most impactful, actionable corrections, most important first.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short headline, e.g. 'Keep your chest up'." },
          detail: {
            type: "string",
            description: "What you saw and exactly how to fix it, with a cue or drill if useful. 1-2 sentences.",
          },
        },
        required: ["title", "detail"],
      },
      maxItems: 3,
    },
    safetyWarning: {
      type: "string",
      description: "A short warning if something risks injury. Empty string if not needed.",
    },
    cameraTip: {
      type: "string",
      description: "How to film the next clip for a more accurate review. Empty string if the angle was good.",
    },
  },
  required: ["isExercise", "exercise", "grade", "summary", "strengths", "tips", "safetyWarning", "cameraTip"],
  propertyOrdering: ["isExercise", "exercise", "grade", "summary", "strengths", "tips", "safetyWarning", "cameraTip"],
};

/** Validates the model's JSON and fills in safe defaults so the UI never crashes on a bad response. */
export function parseAnalysis(raw: unknown): Analysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, 3) : []);
  const grade = GRADES.includes(o.grade as Grade) ? (o.grade as Grade) : "C";
  const tips = Array.isArray(o.tips)
    ? o.tips
        .map((t) => ({ title: str(t?.title), detail: str(t?.detail) }))
        .filter((t) => t.title || t.detail)
        .slice(0, 3)
    : [];

  return {
    isExercise: o.isExercise !== false,
    exercise: str(o.exercise),
    grade,
    summary: str(o.summary),
    strengths: strList(o.strengths),
    tips,
    safetyWarning: str(o.safetyWarning),
    cameraTip: str(o.cameraTip),
  };
}
