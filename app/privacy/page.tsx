import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What AI Gym Coach stores, what it sends to Google's Gemini API, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center px-4">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-iron-50 uppercase">How we handle your data</h1>
        <p className="mt-4 max-w-[34rem] text-lg text-iron-400">Plain-language notes on what happens to your videos and account.</p>

        <div className="mt-10 max-w-[34rem] space-y-8 leading-relaxed text-iron-300 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-iron-50 [&_h2]:uppercase">
          <section>
            <h2>Your videos</h2>
            <p>
              Your browser uploads each video directly to Google&apos;s Gemini API, which analyzes it. Videos never pass
              through or get stored on our own servers, and we delete each one from Gemini as soon as its review is ready
              (if a review can&apos;t finish, Google deletes the file automatically within 48 hours). Depending on how this
              app&apos;s Gemini account is set up, Google&apos;s terms may let it use submitted content to improve its
              services.
            </p>
          </section>
          <section>
            <h2>What we store</h2>
            <p>
              Your name, email and a securely hashed password (or your GitHub or Google sign-in), plus for each analysis:
              the written review, the grade, any note you added, the video&apos;s file name and length, and one small
              still frame so your history has a picture.
            </p>
          </section>
          <section>
            <h2>Sharing</h2>
            <p>
              Reviews are private. If you turn on a share link, anyone with that link can see the review and its still
              frame, but not your notes or email. Turning the link off disables it permanently.
            </p>
          </section>
          <section>
            <h2>Your controls</h2>
            <p>
              From <Link href="/settings" className="text-iron-50 underline decoration-iron-600 underline-offset-4 hover:decoration-iron-50">Settings</Link> you can
              download all of your data as JSON, sign out other devices, or delete your account, which permanently deletes
              every analysis with it.
            </p>
          </section>
          <section>
            <h2>Not medical advice</h2>
            <p>
              AI feedback can be wrong, especially with poor camera angles. It isn&apos;t a substitute for a qualified
              coach or medical advice. Stop if something hurts.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
