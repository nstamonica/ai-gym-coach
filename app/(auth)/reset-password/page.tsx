import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/ui/field";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

// The emailed link goes through /api/auth/reset-password/<token>, which checks the
// token and redirects here with ?token=... (or ?error=INVALID_TOKEN).
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <AuthCard title="This link doesn't work">
        <FormMessage tone="error">This reset link is invalid or has expired.</FormMessage>
        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/forgot-password" className="font-semibold text-blue-300 hover:text-blue-200">
            Request a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be signed out on your other devices.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
