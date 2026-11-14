import { Download } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { auth } from "@/lib/server/auth";
import { requireUser } from "@/lib/server/session";
import { DeleteAccount, PasswordForm, ProfileForm, SignOutEverywhere } from "./forms";

export const metadata: Metadata = { title: "Settings" };

const PROVIDER_NAMES: Record<string, string> = { github: "GitHub", google: "Google" };

export default async function SettingsPage() {
  const user = await requireUser();
  const accounts = await auth.api.listUserAccounts({ headers: await headers() });
  const hasPassword = accounts.some((account) => account.providerId === "credential");
  const socialNames = accounts
    .filter((account) => account.providerId !== "credential")
    .map((account) => PROVIDER_NAMES[account.providerId] ?? account.providerId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Settings" subtitle={user.email} />

      <Card title="Profile">
        <ProfileForm name={user.name} email={user.email} />
      </Card>

      <Card title="Password">
        {hasPassword ? (
          <PasswordForm />
        ) : (
          <p className="text-sm text-slate-400">
            You sign in with {socialNames.join(" and ") || "a social account"}, so there&apos;s no password to change.
          </p>
        )}
      </Card>

      <Card title="Devices" description="Signed in on a shared or lost device? Sign it out from here.">
        <SignOutEverywhere />
      </Card>

      <Card title="Your data" description="Download every analysis we've stored for you, as JSON.">
        <a href="/api/account/export" className={buttonClasses({ variant: "secondary" })} download>
          <Download className="size-4" aria-hidden />
          Download my data
        </a>
      </Card>

      <Card
        title="Delete account"
        description="Permanently deletes your account and every analysis. This can't be undone."
        tone="danger"
      >
        <DeleteAccount requirePassword={hasPassword} />
      </Card>
    </div>
  );
}

function Card({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description?: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        tone === "danger"
          ? "rounded-2xl border border-red-500/25 bg-red-500/5 p-5 sm:p-6"
          : "rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5 sm:p-6"
      }
    >
      <h2 className="font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
