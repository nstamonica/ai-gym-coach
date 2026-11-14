import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { AnalysisSummary } from "@/lib/types";
import { GradeBadge } from "./grade-badge";
import { LocalDate } from "./local-date";
import { Thumbnail } from "./thumbnail";

export function AnalysisList({ items }: { items: AnalysisSummary[] }) {
  return (
    <ul className="divide-y divide-slate-800/80 overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-card)]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/analyses/${item.id}`}
            className="group flex items-center gap-4 p-3 transition hover:bg-slate-800/50 focus-visible:bg-slate-800/50 focus-visible:outline-none sm:p-4"
          >
            <Thumbnail id={item.id} hasThumbnail={item.hasThumbnail} className="aspect-video w-24 shrink-0 rounded-lg sm:w-32" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold text-white">
                {item.isExercise ? item.exercise || item.exerciseLabel : "No exercise detected"}
              </p>
              <p className="text-sm text-slate-400">
                <LocalDate iso={item.createdAt} />
              </p>
              {item.summary && <p className="mt-1 line-clamp-2 hidden text-sm text-slate-400 sm:block">{item.summary}</p>}
            </div>
            <GradeBadge grade={item.isExercise ? item.grade : null} size="sm" />
            <ChevronRight className="size-5 shrink-0 text-slate-600 transition group-hover:text-slate-400" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
