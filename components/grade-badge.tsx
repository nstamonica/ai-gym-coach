import { cx } from "@/lib/cx";
import { GRADE_LABELS, type Grade } from "@/lib/grades";

// Grades are a status scale (A good ... F unsafe). The letter sits inside the
// fill in near-black, which reads on every one of these fills.
export const GRADE_FILL: Record<Grade, string> = {
  A: "bg-emerald-400 text-emerald-950",
  B: "bg-lime-300 text-lime-950",
  C: "bg-amber-300 text-amber-950",
  D: "bg-orange-400 text-orange-950",
  F: "bg-red-400 text-red-950",
};

const SIZES = {
  sm: "size-9 rounded-lg text-lg",
  md: "size-12 rounded-xl text-2xl",
  lg: "size-16 rounded-2xl text-4xl",
} as const;

export function GradeBadge({
  grade,
  size = "md",
  className,
}: {
  grade: Grade | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (!grade) {
    return (
      <span
        className={cx("grid shrink-0 place-items-center bg-slate-800 font-black text-slate-400", SIZES[size], className)}
        aria-label="No grade"
        role="img"
      >
        –
      </span>
    );
  }
  return (
    <span
      className={cx("grid shrink-0 place-items-center font-black", GRADE_FILL[grade], SIZES[size], className)}
      role="img"
      aria-label={`Grade ${grade}: ${GRADE_LABELS[grade]}`}
      title={GRADE_LABELS[grade]}
    >
      {grade}
    </span>
  );
}
