import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { emailEnabled } from "@/lib/server/email";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  // Without an email provider there's no way to deliver the link.
  if (!emailEnabled) notFound();

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-slate-400">
        <Link href="/sign-in" className="font-semibold text-blue-300 hover:text-blue-200">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
