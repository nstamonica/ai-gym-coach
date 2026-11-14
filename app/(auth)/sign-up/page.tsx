import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { enabledSocialProviders } from "@/lib/server/auth";
import { getSession } from "@/lib/server/session";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  if (await getSession()) redirect(next);

  const signInHref = params.next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  return (
    <AuthCard title="Create your account" subtitle="Free. Your form checks are saved so you can track your progress.">
      <SignUpForm next={next} providers={enabledSocialProviders} />
      <p className="mt-6 text-center text-sm text-iron-400">
        Already have an account?{" "}
        <Link href={signInHref} className="font-semibold text-iron-50 underline decoration-iron-600 underline-offset-4 transition hover:decoration-iron-50">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
