import { ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnalysisList } from "@/components/analysis-list";
import { FilmingTips } from "@/components/filming-tips";
import { GRADE_COLOR } from "@/components/grade-badge";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { ProgressChart } from "@/components/progress-chart";
import { buttonClasses } from "@/components/ui/button";
import type { Grade } from "@/lib/grades";
import { summarizeProgress, type ProgressSummary } from "@/lib/progress";
import { listAnalyses, listProgress } from "@/lib/server/analyses";
import { getQuota } from "@/lib/server/quota";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Dashboard" };

const Strong = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-iron-50">{children}</strong>;

/** A grade letter in its own color, with its article: "a B", "an A". */
function GradeText({ grade, article = false }: { grade: Grade; article?: boolean }) {
  return (
    <>
      {article && (grade === "A" || grade === "F" ? "an " : "a ")}
      <strong className="font-semibold" style={{ color: GRADE_COLOR[grade] }}>
        {grade}
      </strong>
    </>
  );
}

/** The state of things in a coach's words, instead of a row of stat tiles. */
function CoachSummary({ summary }: { summary: ProgressSummary }) {
  const { total, last7Days, recentAverage, mostImproved } = summary;
  return (
    <p className="max-w-3xl text-xl leading-relaxed text-pretty text-iron-300 sm:text-2xl sm:leading-relaxed">
      <Strong>
        {total} form {total === 1 ? "check" : "checks"}
      </Strong>{" "}
      so far, {last7Days === 0 ? "none" : last7Days} in the last week.
      {recentAverage && (
        <>
          {" "}
          Over the last 30 days you&apos;re averaging <GradeText grade={recentAverage} article />.
        </>
      )}{" "}
      {mostImproved ? (
        <>
          Your <Strong>{mostImproved.label.toLowerCase()}</Strong> has come the furthest, from{" "}
          <GradeText grade={mostImproved.first.grade} /> to <GradeText grade={mostImproved.latest.grade} />.
        </>
      ) : (
        <>Film a lift again to see whether your fixes are sticking.</>
      )}
    </p>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [entries, recent, quota] = await Promise.all([
    listProgress(user.id),
    listAnalyses(user.id, { limit: 5 }),
    getQuota(user.id),
  ]);
  const firstName = user.name.split(" ")[0] || "there";

  if (recent.total === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-10 py-4">
        <div className="space-y-4">
          <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-iron-50 uppercase sm:text-6xl">
            Welcome, {firstName}
          </h1>
          <p className="text-lg text-pretty text-iron-300">
            Upload a short clip of a set to get your first form grade. Every analysis is saved here so you can track your
            progress lift by lift.
          </p>
        </div>
        <Link href="/analyze" className={buttonClasses({ size: "lg" })}>
          <Plus className="size-5" aria-hidden />
          Analyze your first set
        </Link>
        <FilmingTips />
      </div>
    );
  }

  const summary = summarizeProgress(entries);

  return (
    <div className="space-y-14">
      <div className="space-y-5">
        <PageHeader title={`Welcome back, ${firstName}`} />
        <section aria-label="Summary" className="space-y-3">
          <CoachSummary summary={summary} />
          <p className="text-sm text-iron-400">
            {quota.remaining} of {quota.limit} analyses left in the last 24 hours.
          </p>
        </section>
      </div>

      {summary.exercises.length > 0 && <ProgressChart exercises={summary.exercises} />}

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <SectionHeading id="recent-heading">Recent form checks</SectionHeading>
          {recent.total > recent.items.length && (
            <Link
              href="/history"
              className="group inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-iron-300 transition hover:text-iron-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100"
            >
              View all {recent.total}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
        <AnalysisList items={recent.items} />
      </section>
    </div>
  );
}
