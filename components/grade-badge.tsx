import { cx } from "@/lib/cx";
import { GRADE_LABELS, type Grade } from "@/lib/grades";

/** Each grade's color as a CSS value, for SVG fills and inline styles. Defined in globals.css. */
export const GRADE_COLOR: Record<Grade, string> = {
  A: "var(--grade-a)",
  B: "var(--grade-b)",
  C: "var(--grade-c)",
  D: "var(--grade-d)",
  F: "var(--grade-f)",
};

// Grades are a status scale (A good ... F unsafe). The letter sits inside the
// fill in near-black, which reads on every one of these fills.
const GRADE_FILL: Record<Grade, string> = {
  A: "bg-[var(--grade-a)]",
  B: "bg-[var(--grade-b)]",
  C: "bg-[var(--grade-c)]",
  D: "bg-[var(--grade-d)]",
  F: "bg-[var(--grade-f)]",
};

const SIZES = {
  sm: "size-9 rounded-md text-2xl",
  md: "size-12 rounded-md text-3xl",
  lg: "size-16 rounded-lg text-5xl",
} as const;

export function GradeBadge({
  grade,
  size = "md",
  reveal = false,
  className,
}: {
  grade: Grade | null;
  size?: keyof typeof SIZES;
  /** Stamp the grade in, for the moment a new review arrives. */
  reveal?: boolean;
  className?: string;
}) {
  const base = "grid shrink-0 place-items-center font-display leading-none font-bold";
  if (!grade) {
    return (
      <span className={cx(base, "bg-iron-800 text-iron-400", SIZES[size], className)} aria-label="No grade" role="img">
        –
      </span>
    );
  }
  return (
    <span
      className={cx(base, "text-iron-950", GRADE_FILL[grade], SIZES[size], reveal && "animate-grade-stamp", className)}
      role="img"
      aria-label={`Grade ${grade}: ${GRADE_LABELS[grade]}`}
      title={GRADE_LABELS[grade]}
    >
      {grade}
    </span>
  );
}
