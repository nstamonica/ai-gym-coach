import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AnalysisReport } from "@/components/analysis-report";
import { LocalDate } from "@/components/local-date";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { Thumbnail } from "@/components/thumbnail";
import { buttonClasses } from "@/components/ui/button";
import { isShareToken } from "@/lib/ids";
import { getSharedAnalysis } from "@/lib/server/analyses";

const load = cache(async (token: string) => (isShareToken(token) ? getSharedAnalysis(token) : null));

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const shared = await load((await params).token);
  if (!shared) return { title: "Not found" };
  const title = `${shared.exercise || shared.exerciseLabel}: grade ${shared.grade ?? "–"}`;
  return {
    title,
    description: shared.feedback.summary,
    // Share links are unlisted: reachable by link, never indexed.
    robots: { index: false, follow: false },
    openGraph: { title, description: shared.feedback.summary },
  };
}

export default async function SharedAnalysisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await load(token);
  if (!shared) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <Logo />
        <Link href="/sign-up" className={buttonClasses({ size: "sm" })}>
          Try it free
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <article className="rounded-lg border border-iron-800 bg-iron-900 p-5 sm:p-8">
          <AnalysisReport
            analysis={shared}
            showNotes={false}
            headingLevel="h1"
            media={
              shared.hasThumbnail && (
                <Thumbnail id={shared.id} hasThumbnail token={token} className="aspect-video w-full rounded-md" />
              )
            }
          />
          <p className="mt-8 border-t border-iron-800 pt-5 text-sm text-iron-400">
            {shared.ownerName ? `${shared.ownerName}'s` : "A"} form check, reviewed by AI Gym Coach on{" "}
            <LocalDate iso={shared.createdAt} />.
          </p>
        </article>

        <section className="flex flex-col items-start gap-4 rounded-lg border border-iron-800 bg-iron-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-iron-50 uppercase">Want a review of your own lifts?</h2>
            <p className="text-iron-400">Upload a clip and get a grade and corrections in about a minute.</p>
          </div>
          <Link href="/sign-up" className={buttonClasses()}>
            Get started free
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
