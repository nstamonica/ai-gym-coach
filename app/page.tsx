import {
  ChartLine,
  Gauge,
  History,
  Lock,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { AnalysisReport } from "@/components/analysis-report";
import { LandingNav } from "@/components/landing-nav";
import { Logo } from "@/components/logo";
import { SampleFrame } from "@/components/sample-frame";
import { SiteFooter } from "@/components/site-footer";
import { buttonClasses } from "@/components/ui/button";
import type { AnalysisView, PreviousResult } from "@/lib/types";

const SAMPLE: Pick<AnalysisView, "isExercise" | "exercise" | "exerciseLabel" | "grade" | "feedback" | "notes"> = {
  isExercise: true,
  exercise: "High-bar back squat",
  exerciseLabel: "Back squat",
  grade: "B",
  notes: null,
  feedback: {
    summary:
      "A strong, consistent set. You hit depth on every rep, but on the last two your hips rise faster than your chest coming out of the bottom.",
    progressNote:
      "Your depth is far more consistent than last time, and the forward lean you were working on is gone for the first three reps.",
    tips: [
      {
        title: "Lead with your chest out of the hole",
        detail: "From 0:09 your hips shoot up first and the bar drifts forward. Think “chest to the ceiling” as you drive up.",
      },
      {
        title: "Brace before every rep",
        detail: "Take a big breath into your belly at the top and hold it through the rep instead of breathing at the bottom.",
      },
      {
        title: "Push your knees out on the way up",
        detail: "Your left knee drifts inward on the fourth rep. Spread the floor with your feet as you stand.",
      },
    ],
    strengths: ["Hits depth on every rep", "Bar stays over mid-foot on the way down", "Controlled, steady tempo"],
    safetyWarning: "",
    cameraTip: "",
  },
};

const SAMPLE_PREVIOUS: PreviousResult = { id: "sample", grade: "C", createdAt: "2026-10-28T17:30:00.000Z" };

const STEPS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Video, title: "Film one set", text: "Side-on or at a 45° angle, with your whole body in frame." },
  { Icon: Upload, title: "Upload it", text: "MP4, MOV or WebM up to 90 seconds, straight from your phone." },
  { Icon: Sparkles, title: "Get coached", text: "A grade, your top three fixes and any safety warnings, in under a minute." },
];

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Gauge, title: "A grade, not a guess", text: "Every set gets an A–F grade and the three corrections that will help most." },
  { Icon: ShieldAlert, title: "Safety first", text: "Anything that risks an injury is flagged before anything else." },
  {
    Icon: History,
    title: "A coach that remembers",
    text: "Each review is compared with your last session of the same lift, so you know whether the fixes stuck.",
  },
  { Icon: ChartLine, title: "Progress you can see", text: "Your dashboard charts your grade over time for every lift you film." },
  {
    Icon: Lock,
    title: "Private by default",
    text: "Videos are deleted as soon as the review is ready. Share a review only if you choose to.",
  },
  { Icon: Smartphone, title: "Made for your phone", text: "Film between sets and get feedback before your next one." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <LandingNav />
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 pt-12 pb-20 lg:grid-cols-[1fr_minmax(0,32rem)] lg:pt-16">
          <div className="space-y-7 lg:sticky lg:top-12 lg:pt-16">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
              <Sparkles className="size-4" aria-hidden />
              Form feedback powered by Gemini
            </p>
            <h1 className="text-5xl font-extrabold tracking-tight text-balance text-white sm:text-6xl">
              Film your set.{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Fix your form.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-slate-300">
              Upload a short clip of your lift and get a grade, the three corrections that matter most and any safety
              warnings. Every review is saved, so you can watch your form improve lift by lift.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
                Get started free
              </Link>
              <Link href="/sign-in" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Sign in
              </Link>
            </div>
            <p className="text-sm text-slate-400">Squats, deadlifts, presses, rows, pull-ups and more.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-emerald-500/10 blur-2xl" aria-hidden />
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5 shadow-2xl shadow-black/50 sm:p-6">
              <p className="mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">Sample review</p>
              <AnalysisReport analysis={SAMPLE} previous={SAMPLE_PREVIOUS} media={<SampleFrame />} linkPrevious={false} />
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-y border-white/5 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="how-heading" className="text-center text-3xl font-bold tracking-tight text-white">
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map(({ Icon, title, text }, i) => (
                <li key={title} className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-400">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-slate-400">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="features-heading" className="text-center text-3xl font-bold tracking-tight text-white">
            Built like a coach, not a chatbot
          </h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <Icon className="mt-1 size-6 shrink-0 text-emerald-400" aria-hidden />
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-slate-400">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-slate-900 to-emerald-600/10 px-6 py-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white">Your next set could be your best one.</h2>
            <p className="max-w-xl text-slate-300">Create a free account and get your first review in about a minute.</p>
            <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
              Analyze your form
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
