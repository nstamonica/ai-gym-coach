"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

/** Public-page actions: "Open dashboard" when signed in, otherwise sign in / get started. */
export function LandingNav() {
  const { data: session } = useSession();

  if (session) {
    return (
      <Link href="/dashboard" className={buttonClasses({ size: "sm" })}>
        Open dashboard
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/sign-in" className={buttonClasses({ variant: "ghost", size: "sm" })}>
        Sign in
      </Link>
      <Link href="/sign-up" className={buttonClasses({ size: "sm" })}>
        Get started
      </Link>
    </div>
  );
}
