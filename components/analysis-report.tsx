import { Camera, Check, MessageSquareText, ShieldAlert, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { GRADE_LABELS } from "@/lib/grades";
import type { AnalysisView, PreviousResult } from "@/lib/types";
import { GradeBadge } from "./grade-badge";
import { GradeChange } from "./grade-change";

type ReportData = Pick<AnalysisView, "isExercise" | "exercise" | "exerciseLabel" | "grade" | "feedback" | "notes">;

/** The coach's review of one set. Used on the analyze, detail, share and landing pages. */
export function AnalysisReport({
  analysis,
  previous,
  media,
  showNotes = true,
  linkPrevious = true,
  headingLevel = "h2",
}: {
  analysis: ReportData;
  previous?: PreviousResult | null;
  /** The video or thumbnail, shown above the review. */
  media?: ReactNode;
  showNotes?: boolean;
  linkPrevious?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const { feedback } = analysis;
  const Heading = headingLevel;

  if (!analysis.isExercise) {
    return (
      <div className="space-y-6">
        {media}
        <div className="space-y-2 text-center">
          <Heading className="text-xl font-bold text-white">No exercise detected</Heading>
          <p className="text-slate-400">
            {feedback.summary ||
              "We couldn't find anyone exercising in this clip. Try a video that shows your whole body during a set."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {media}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{analysis.exerciseLabel}</p>
          <Heading className="text-2xl font-bold text-balance text-white sm:text-3xl">
            {analysis.exercise || analysis.exerciseLabel}
          </Heading>
          {analysis.grade && <p className="text-sm text-slate-400">{GRADE_LABELS[analysis.grade]} form</p>}
        </div>
        <GradeBadge grade={analysis.grade} size="lg" />
      </div>

      {previous && analysis.grade && <GradeChange grade={analysis.grade} previous={previous} linkPrevious={linkPrevious} />}

      {feedback.summary && <p className="text-lg leading-relaxed text-pretty text-slate-200">{feedback.summary}</p>}

      {feedback.safetyWarning && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-100">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
          <p>
            <span className="font-semibold">Safety: </span>
            {feedback.safetyWarning}
          </p>
        </div>
      )}

      {feedback.progressNote && (
        <section className="flex gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <TrendingUp className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
          <div>
            <h3 className="font-semibold text-blue-100">Since last time</h3>
            <p className="mt-0.5 text-slate-300">{feedback.progressNote}</p>
          </div>
        </section>
      )}

      {feedback.tips.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold tracking-wider text-blue-300 uppercase">How to improve</h3>
          <ol className="space-y-4">
            {feedback.tips.map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{tip.title}</p>
                  {tip.detail && <p className="mt-0.5 text-slate-400">{tip.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {feedback.strengths.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wider text-emerald-300 uppercase">What you&apos;re doing well</h3>
          <ul className="space-y-2">
            {feedback.strengths.map((strength, i) => (
              <li key={i} className="flex gap-2.5 text-slate-300">
                <Check className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
                {strength}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(feedback.cameraTip || (showNotes && analysis.notes)) && (
        <div className="space-y-3 border-t border-slate-800 pt-5 text-sm">
          {feedback.cameraTip && (
            <p className="flex gap-2.5 text-slate-400">
              <Camera className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-slate-300">Filming tip: </span>
                {feedback.cameraTip}
              </span>
            </p>
          )}
          {showNotes && analysis.notes && (
            <p className="flex gap-2.5 text-slate-400">
              <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-slate-300">Your note: </span>
                {analysis.notes}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
