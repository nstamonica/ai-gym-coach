import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { gradeChange, type Grade } from "@/lib/grades";
import type { PreviousResult } from "@/lib/types";
import { LocalDate } from "./local-date";

/** "Up from C since Oct 3": how this grade compares with the previous session of the same lift. */
export function GradeChange({ grade, previous, linkPrevious = true }: { grade: Grade; previous: PreviousResult; linkPrevious?: boolean }) {
  const change = gradeChange(previous.grade, grade);
  const { Icon, tone, text } =
    change > 0
      ? { Icon: ArrowUpRight, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", text: `Up from ${previous.grade}` }
      : change < 0
        ? { Icon: ArrowDownRight, tone: "border-orange-500/30 bg-orange-500/10 text-orange-200", text: `Down from ${previous.grade}` }
        : { Icon: Equal, tone: "border-slate-600 bg-slate-800/60 text-slate-200", text: `Same as last time (${previous.grade})` };

  const date = <LocalDate iso={previous.createdAt} format="short" />;
  return (
    <p className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium", tone)}>
      <Icon className="size-4" aria-hidden />
      <span>
        {text} ·{" "}
        {linkPrevious ? (
          <Link href={`/analyses/${previous.id}`} className="underline decoration-current/40 underline-offset-2 hover:decoration-current">
            {date}
          </Link>
        ) : (
          date
        )}
      </span>
    </p>
  );
}
