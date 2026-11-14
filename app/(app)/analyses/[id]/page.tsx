import { ChevronLeft, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AnalysisReport } from "@/components/analysis-report";
import { LocalDate } from "@/components/local-date";
import { Thumbnail } from "@/components/thumbnail";
import { buttonClasses } from "@/components/ui/button";
import { isUuid } from "@/lib/ids";
import { getAnalysis, getPreviousResult } from "@/lib/server/analyses";
import { requireUser } from "@/lib/server/session";
import { DeleteAnalysisButton } from "./delete-button";
import { ShareControl } from "./share-control";

// Shared by generateMetadata and the page, so the analysis is only loaded once per request.
const load = cache(async (id: string) => {
  const user = await requireUser();
  return isUuid(id) ? { user, analysis: await getAnalysis(id, user.id) } : { user, analysis: null };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { analysis } = await load((await params).id);
  return { title: analysis ? analysis.exercise || analysis.exerciseLabel : "Analysis" };
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, analysis } = await load((await params).id);
  if (!analysis) notFound();

  const previous = analysis.isExercise
    ? await getPreviousResult(user.id, analysis.exerciseKey, new Date(analysis.createdAt))
    : null;

  return (
    <div className="space-y-6">
      <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white">
        <ChevronLeft className="size-4" aria-hidden />
        History
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5 sm:p-8">
          <AnalysisReport
            analysis={analysis}
            previous={previous}
            headingLevel="h1"
            media={
              analysis.hasThumbnail && (
                <Thumbnail
                  id={analysis.id}
                  hasThumbnail
                  alt={`Frame from ${analysis.videoName}`}
                  className="aspect-video w-full rounded-xl"
                />
              )
            }
          />
        </article>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5">
            <h2 className="text-sm font-semibold text-white">Details</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-slate-400">Analyzed</dt>
                <dd className="text-slate-200">
                  <LocalDate iso={analysis.createdAt} format="datetime" />
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Video</dt>
                <dd className="truncate text-slate-200">
                  {analysis.videoName}
                  {analysis.videoSeconds ? ` · ${Math.round(analysis.videoSeconds)} s` : ""}
                </dd>
              </div>
              {analysis.model && (
                <div>
                  <dt className="text-slate-400">Model</dt>
                  <dd className="text-slate-200">{analysis.model}</dd>
                </div>
              )}
            </dl>
          </section>

          {analysis.isExercise && <ShareControl id={analysis.id} initialToken={analysis.shareToken} />}

          <Link href="/analyze" className={buttonClasses({ variant: "secondary", className: "w-full" })}>
            <RefreshCw className="size-4" aria-hidden />
            Film this lift again
          </Link>
          <DeleteAnalysisButton id={analysis.id} />
        </aside>
      </div>
    </div>
  );
}
