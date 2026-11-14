import { Download } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { cx } from "@/lib/cx";
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
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Settings" subtitle={user.email} />

      <div className="divide-y divide-iron-800 border-y border-iron-800">
        <Section title="Profile" description="Your name shows on your dashboard and on reviews you share.">
          <ProfileForm name={user.name} email={user.email} />
        </Section>

        <Section title="Password" description="Changing it signs you out on your other devices.">
          {hasPassword ? (
            <PasswordForm />
          ) : (
            <p className="text-sm text-iron-400">
              You sign in with {socialNames.join(" and ") || "a social account"}, so there&apos;s no password to change.
            </p>
          )}
        </Section>

        <Section title="Devices" description="Signed in on a shared or lost device? Sign it out from here.">
          <SignOutEverywhere />
        </Section>

        <Section title="Your data" description="Download every analysis we've stored for you, as JSON.">
          <a href="/api/account/export" className={buttonClasses({ variant: "secondary" })} download>
            <Download className="size-4" aria-hidden />
            Download my data
          </a>
        </Section>

        <Section
          title="Delete account"
          description="Permanently deletes your account and every analysis. This can't be undone."
          tone="danger"
        >
          <DeleteAccount requirePassword={hasPassword} />
        </Section>
      </div>
    </div>
  );
}

/** One settings group: title and description on the left, controls on the right. */
function Section({
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
    <section className="grid gap-5 py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2
          className={cx(
            "font-display text-xl leading-tight font-bold tracking-tight uppercase",
            tone === "danger" ? "text-red-300" : "text-iron-50",
          )}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-pretty text-iron-400">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
