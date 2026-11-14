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
  revealGrade = false,
}: {
  analysis: ReportData;
  previous?: PreviousResult | null;
  /** The video or thumbnail, shown above the review. */
  media?: ReactNode;
  showNotes?: boolean;
  linkPrevious?: boolean;
  headingLevel?: "h1" | "h2";
  /** Animate the grade in (for a review that just arrived). */
  revealGrade?: boolean;
}) {
  const { feedback } = analysis;
  const Heading = headingLevel;
  // Section headings sit one level below the title, so the outline never skips a level.
  const SubHeading = headingLevel === "h1" ? "h2" : "h3";
  // "Back squat · Excellent form": the lift it's tracked under (when the model's name
  // differs from it) and what the grade means.
  const meta = [
    analysis.exercise && analysis.exercise.toLowerCase() !== analysis.exerciseLabel.toLowerCase() ? analysis.exerciseLabel : null,
    analysis.grade ? `${GRADE_LABELS[analysis.grade]} form` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!analysis.isExercise) {
    return (
      <div className="space-y-6">
        {media}
        <div className="space-y-2 text-center">
          <Heading className="font-display text-3xl font-bold tracking-tight text-iron-50 uppercase">No exercise detected</Heading>
          <p className="text-iron-400">
            {feedback.summary ||
              "We couldn't find anyone exercising in this clip. Try a video that shows your whole body during a set."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {media}

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Heading className="font-display text-3xl leading-[0.95] font-bold tracking-tight text-balance text-iron-50 uppercase sm:text-4xl">
              {analysis.exercise || analysis.exerciseLabel}
            </Heading>
            {meta && <p className="text-sm text-iron-400">{meta}</p>}
          </div>
          <GradeBadge grade={analysis.grade} size="lg" reveal={revealGrade} />
        </div>
        {previous && analysis.grade && <GradeChange grade={analysis.grade} previous={previous} linkPrevious={linkPrevious} />}
      </div>

      {feedback.summary && <p className="text-lg leading-relaxed text-pretty text-iron-200">{feedback.summary}</p>}

      {feedback.safetyWarning && (
        <div role="alert" className="flex gap-3 rounded-md border border-red-400/50 bg-red-500/10 p-4 text-red-100">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
          <p>
            <span className="font-semibold">Safety: </span>
            {feedback.safetyWarning}
          </p>
        </div>
      )}

      {feedback.progressNote && (
        <section className="flex gap-3">
          <TrendingUp className="mt-0.5 size-5 shrink-0 text-iron-400" aria-hidden />
          <div>
            <SubHeading className="label-caps text-iron-300">Since last time</SubHeading>
            <p className="mt-1 text-iron-200">{feedback.progressNote}</p>
          </div>
        </section>
      )}

      {feedback.tips.length > 0 && (
        <section>
          {/* Numbered because the order is the priority: fix the first one first. */}
          <SubHeading className="label-caps text-iron-400">How to improve, most important first</SubHeading>
          <ol className="mt-3 divide-y divide-iron-800 border-y border-iron-800">
            {feedback.tips.map((tip, i) => (
              <li key={i} className="flex gap-4 py-4">
                <span className="w-5 shrink-0 font-display text-3xl leading-none font-bold text-iron-500 tabular-nums" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-iron-50">{tip.title}</p>
                  {tip.detail && <p className="mt-1 text-iron-400">{tip.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {feedback.strengths.length > 0 && (
        <section>
          <SubHeading className="label-caps text-iron-400">What you&apos;re doing well</SubHeading>
          <ul className="mt-3 space-y-2">
            {feedback.strengths.map((strength, i) => (
              <li key={i} className="flex gap-2.5 text-iron-200">
                <Check className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
                {strength}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(feedback.cameraTip || (showNotes && analysis.notes)) && (
        <div className="space-y-3 border-t border-iron-800 pt-5 text-sm">
          {feedback.cameraTip && (
            <p className="flex gap-2.5 text-iron-400">
              <Camera className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-iron-300">Filming tip: </span>
                {feedback.cameraTip}
              </span>
            </p>
          )}
          {showNotes && analysis.notes && (
            <p className="flex gap-2.5 text-iron-400">
              <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-iron-300">Your note: </span>
                {analysis.notes}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
