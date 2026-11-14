import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnalysisList } from "@/components/analysis-list";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { summarizeProgress } from "@/lib/progress";
import { listAnalyses, listProgress } from "@/lib/server/analyses";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "History" };

const PAGE_SIZE = 12;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const exercise = params.exercise || undefined;

  const [list, progress] = await Promise.all([
    listAnalyses(user.id, { exerciseKey: exercise, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    listProgress(user.id),
  ]);
  const lifts = summarizeProgress(progress).exercises.sort((a, b) => b.count - a.count);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  const href = (next: { exercise?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (next.exercise) query.set("exercise", next.exercise);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const qs = query.toString();
    return qs ? `/history?${qs}` : "/history";
  };

  const chip = (active: boolean) =>
    cx(
      "rounded-md border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100",
      active
        ? "border-iron-100 bg-iron-100 text-iron-950"
        : "border-iron-700 text-iron-300 hover:border-iron-500 hover:text-iron-50",
    );
  const count = (active: boolean) => cx("ml-1.5 tabular-nums", active ? "text-iron-600" : "text-iron-400");

  return (
    <div className="space-y-8">
      <PageHeader
        title="History"
        subtitle={`${list.total} form ${list.total === 1 ? "check" : "checks"}${exercise ? " for this lift" : ""}`}
      />

      {lifts.length > 1 && (
        <nav aria-label="Filter by lift" className="flex flex-wrap gap-2">
          <Link href={href({})} className={chip(!exercise)} aria-current={!exercise ? "page" : undefined}>
            All
          </Link>
          {lifts.map((lift) => (
            <Link
              key={lift.key}
              href={href({ exercise: lift.key })}
              className={chip(exercise === lift.key)}
              aria-current={exercise === lift.key ? "page" : undefined}
            >
              {lift.label}
              <span className={count(exercise === lift.key)}>{lift.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {list.items.length > 0 ? (
        <AnalysisList items={list.items} />
      ) : (
        <div className="rounded-lg border border-dashed border-iron-700 px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-iron-50 uppercase">
            {page > 1 ? "No more form checks." : "No form checks yet."}
          </p>
          <p className="mt-1 text-iron-400">Your analyses will show up here.</p>
          <Link href="/analyze" className={buttonClasses({ className: "mt-5" })}>
            Analyze a set
          </Link>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4">
          <span className="text-sm text-iron-400 tabular-nums">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href({ exercise, page: page - 1 })} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                <ChevronLeft className="size-4" aria-hidden />
                Newer
              </Link>
            )}
            {page < pages && (
              <Link href={href({ exercise, page: page + 1 })} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Older
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
