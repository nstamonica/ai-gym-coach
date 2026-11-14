import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { exerciseAbbreviation } from "@/lib/exercises";
import type { AnalysisSummary } from "@/lib/types";
import { GradeBadge } from "./grade-badge";
import { LocalDate } from "./local-date";
import { Thumbnail } from "./thumbnail";

export function AnalysisList({ items }: { items: AnalysisSummary[] }) {
  return (
    <ul className="divide-y divide-iron-800 overflow-hidden rounded-lg border border-iron-800 bg-iron-900/70">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/analyses/${item.id}`}
            className="group flex items-center gap-4 p-3 transition hover:bg-iron-800/50 focus-visible:bg-iron-800/50 focus-visible:outline-none sm:gap-5 sm:p-4"
          >
            <Thumbnail
              id={item.id}
              hasThumbnail={item.hasThumbnail}
              abbreviation={item.isExercise ? exerciseAbbreviation(item.exerciseKey, item.exercise) : undefined}
              className="aspect-[4/3] w-20 shrink-0 rounded-md sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold text-iron-50">
                {item.isExercise ? item.exercise || item.exerciseLabel : "No exercise detected"}
              </p>
              <p className="text-sm text-iron-400">
                <LocalDate iso={item.createdAt} />
              </p>
              {/* The wrapper toggles visibility so it doesn't override line-clamp's display. */}
              {item.summary && (
                <div className="mt-1 hidden sm:block">
                  <p className="line-clamp-1 text-sm text-iron-400">{item.summary}</p>
                </div>
              )}
            </div>
            <GradeBadge grade={item.isExercise ? item.grade : null} size="sm" />
            <ChevronRight
              className="size-5 shrink-0 text-iron-600 transition group-hover:translate-x-0.5 group-hover:text-iron-300"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
