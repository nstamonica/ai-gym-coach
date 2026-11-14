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
      "rounded-full border px-3 py-1.5 text-sm font-medium transition",
      active
        ? "border-blue-500/60 bg-blue-500/15 text-white"
        : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white",
    );

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
              <span className="ml-1.5 text-slate-400">{lift.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {list.items.length > 0 ? (
        <AnalysisList items={list.items} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-14 text-center">
          <p className="font-semibold text-white">{page > 1 ? "No more form checks." : "No form checks yet."}</p>
          <p className="mt-1 text-slate-400">Your analyses will show up here.</p>
          <Link href="/analyze" className={buttonClasses({ className: "mt-5" })}>
            Analyze a set
          </Link>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={href({ exercise, page: page - 1 })} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ChevronLeft className="size-4" aria-hidden />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-slate-400">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ exercise, page: page + 1 })} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Older
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
