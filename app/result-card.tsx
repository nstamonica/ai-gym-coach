import type { Analysis, Grade } from "@/lib/analysis";

const GRADE_STYLES: Record<Grade, string> = {
  A: "bg-emerald-500 text-emerald-950",
  B: "bg-lime-400 text-lime-950",
  C: "bg-amber-400 text-amber-950",
  D: "bg-orange-500 text-orange-950",
  F: "bg-red-500 text-red-950",
};

interface Props {
  result: Analysis;
  videoUrl: string | null;
  onReset: () => void;
}

export default function ResultCard({ result, videoUrl, onReset }: Props) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
      {videoUrl && <video src={videoUrl} controls playsInline muted className="max-h-[50vh] w-full rounded-xl bg-black" />}

      {result.isExercise ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Exercise</p>
              <h2 className="text-2xl font-bold text-white">{result.exercise || "Unknown exercise"}</h2>
            </div>
            <div
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-xl text-4xl font-black ${GRADE_STYLES[result.grade]}`}
              aria-label={`Form grade: ${result.grade}`}
            >
              {result.grade}
            </div>
          </div>

          {result.summary && <p className="text-slate-300">{result.summary}</p>}

          {result.safetyWarning && (
            <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              <span className="font-bold">Safety: </span>
              {result.safetyWarning}
            </div>
          )}

          {result.tips.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">How to improve</h3>
              <ol className="space-y-4">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{tip.title}</p>
                      <p className="mt-0.5 text-sm text-slate-400">{tip.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.strengths.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">What you&apos;re doing well</h3>
              <ul className="space-y-2 text-slate-300">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400" aria-hidden>
                      ✓
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.cameraTip && (
            <p className="border-t border-slate-800 pt-4 text-sm text-slate-400">
              <span className="font-semibold text-slate-300">Filming tip: </span>
              {result.cameraTip}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold text-white">No exercise detected</h2>
          <p className="text-slate-400">
            {result.summary || "We couldn't find anyone exercising in this clip. Try a video that shows your whole body during a set."}
          </p>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold shadow-lg shadow-blue-900/20 transition hover:bg-blue-500"
      >
        Analyze another video
      </button>
    </section>
  );
}
