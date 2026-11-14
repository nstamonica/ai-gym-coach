import Link from "next/link";
import { AnalysisReport } from "@/components/analysis-report";
import { LandingNav } from "@/components/landing-nav";
import { Logo } from "@/components/logo";
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

const STEPS = [
  { title: "Film one set", text: "Side-on or at a 45° angle, with your whole body and the bar in frame." },
  { title: "Upload it", text: "MP4, MOV or WebM up to 90 seconds, straight from your phone." },
  { title: "Get coached", text: "A grade, your top three fixes and any safety warnings, in about a minute." },
];

const FEATURES = [
  { title: "A grade, not a guess", text: "Every set gets an A–F grade and the three corrections that will help most." },
  { title: "Safety first", text: "Anything that risks an injury is flagged before anything else." },
  {
    title: "A coach that remembers",
    text: "Each review is compared with your last session of the same lift, so you know whether the fixes stuck.",
  },
  { title: "Progress you can see", text: "Your dashboard charts your grade over time for every lift you film." },
  { title: "Private by default", text: "Videos are deleted as soon as the review is ready. Share a review only if you choose to." },
  { title: "Made for your phone", text: "Film between sets and get feedback before your next one." },
];

const SECTION_TITLE = "font-display text-4xl leading-[0.95] font-bold tracking-tight text-balance text-iron-50 uppercase sm:text-5xl";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <LandingNav />
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 pt-10 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16 lg:pt-14">
          <div className="lg:sticky lg:top-14 lg:pt-16">
            <h1 className="font-display text-6xl leading-[0.86] font-bold tracking-tight uppercase sm:text-7xl md:text-8xl lg:text-7xl xl:text-8xl">
              <span className="block text-iron-500">Film your set.</span>
              <span className="block text-iron-50">Fix your form.</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-pretty text-iron-300">
              Upload a short clip of your lift and get a grade, the three corrections that matter most and any safety
              warnings. Every review is saved, so you can watch your form improve lift by lift.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
                Get started free
              </Link>
              <Link href="/sign-in" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-sm text-iron-400">Squats, deadlifts, presses, rows, pull-ups and more.</p>
          </div>

          <figure>
            <div className="rounded-lg border border-iron-800 bg-iron-900 p-5 sm:p-7">
              <AnalysisReport analysis={SAMPLE} previous={SAMPLE_PREVIOUS} linkPrevious={false} />
            </div>
            <figcaption className="mt-3 text-sm text-iron-400">
              A sample review. Yours arrives about a minute after you upload a set.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="how-heading" className="border-t border-iron-800">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 id="how-heading" className={SECTION_TITLE}>
              How it works
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {STEPS.map(({ title, text }) => (
                <li key={title} className="border-t-2 border-iron-100 pt-5">
                  <h3 className="font-display text-3xl leading-none font-bold tracking-tight text-iron-50 uppercase">{title}</h3>
                  <p className="mt-3 text-iron-400">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="border-t border-iron-800">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 id="features-heading" className={SECTION_TITLE}>
                Built like a coach, not a chatbot
              </h2>
              <p className="mt-5 text-lg text-pretty text-iron-400">
                It grades the set, tells you what to fix first and remembers what you were working on last time.
              </p>
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {FEATURES.map(({ title, text }) => (
                <div key={title} className="border-t border-iron-800 py-6">
                  <dt className="font-display text-xl font-bold tracking-tight text-iron-50 uppercase">{title}</dt>
                  <dd className="mt-1.5 text-iron-400">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-iron-800">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="max-w-2xl font-display text-5xl leading-[0.9] font-bold tracking-tight text-balance text-iron-50 uppercase sm:text-6xl">
                Your next set could be your best one.
              </h2>
              <p className="mt-4 text-lg text-iron-400">Create a free account and get your first review in about a minute.</p>
            </div>
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
