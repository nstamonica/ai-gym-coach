import { ArrowRight, Plus, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnalysisList } from "@/components/analysis-list";
import { FilmingTips } from "@/components/filming-tips";
import { PageHeader } from "@/components/page-header";
import { ProgressChart } from "@/components/progress-chart";
import { StatTile } from "@/components/stat-tile";
import { buttonClasses } from "@/components/ui/button";
import { summarizeProgress } from "@/lib/progress";
import { listAnalyses, listProgress } from "@/lib/server/analyses";
import { getQuota } from "@/lib/server/quota";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Dashboard" };

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
      <div className="mx-auto max-w-2xl space-y-8 py-4 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
          <Upload className="size-8" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome, {firstName}</h1>
          <p className="text-lg text-slate-400">
            Upload a short clip of a set to get your first form grade. Every analysis is saved here so you can track your
            progress lift by lift.
          </p>
        </div>
        <Link href="/analyze" className={buttonClasses({ size: "lg" })}>
          <Plus className="size-5" aria-hidden />
          Analyze your first set
        </Link>
        <div className="text-left">
          <FilmingTips />
        </div>
      </div>
    );
  }

  const summary = summarizeProgress(entries);
  const improved = summary.mostImproved;

  return (
    <div className="space-y-10">
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Here's how your form is trending." />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Form checks" value={summary.total} detail={`${summary.last7Days} in the last 7 days`} />
        <StatTile label="Average grade" value={summary.recentAverage ?? "–"} detail="Last 30 days" />
        <StatTile
          label="Most improved"
          value={improved ? `${improved.first.grade} → ${improved.latest.grade}` : "–"}
          detail={improved ? improved.label : "Film a lift twice to compare"}
        />
        <StatTile label="Analyses left" value={quota.remaining} detail={`of ${quota.limit} per 24 hours`} />
      </section>

      {summary.exercises.length > 0 && <ProgressChart exercises={summary.exercises} />}

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-heading" className="text-lg font-semibold text-white">
            Recent form checks
          </h2>
          {recent.total > recent.items.length && (
            <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-blue-300 hover:text-blue-200">
              View all {recent.total}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <AnalysisList items={recent.items} />
      </section>
    </div>
  );
}
