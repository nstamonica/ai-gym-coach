import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { oauthErrorMessage } from "@/lib/auth-errors";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { enabledSocialProviders } from "@/lib/server/auth";
import { emailEnabled } from "@/lib/server/email";
import { getSession } from "@/lib/server/session";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  if (await getSession()) redirect(next);

  const signUpHref = params.next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to see your form checks and progress.">
      <SignInForm
        next={next}
        providers={enabledSocialProviders}
        canResetPassword={emailEnabled}
        notice={params.reset === "1" ? "Your password was changed. Sign in with your new password." : null}
        initialError={oauthErrorMessage(params.error)}
      />
      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{" "}
        <Link href={signUpHref} className="font-semibold text-blue-300 hover:text-blue-200">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
