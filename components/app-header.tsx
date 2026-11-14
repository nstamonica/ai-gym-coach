"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { Logo } from "./logo";
import { UserMenu, type MenuUser } from "./user-menu";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
] as const;

export function AppHeader({ user }: { user: MenuUser }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/history" && pathname.startsWith("/analyses/"));

  // Tabs: the active one gets a chalk bar sitting on the header's bottom edge.
  const nav = (className: string) => (
    <nav aria-label="Main" className={className}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={cx(
            "relative inline-flex items-center text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100",
            isActive(link.href)
              ? "text-iron-50 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-iron-50"
              : "text-iron-400 hover:text-iron-50",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-iron-800 bg-iron-950">
      <div className="mx-auto flex h-16 max-w-5xl items-stretch gap-8 px-4">
        <div className="flex items-center">
          <Logo href="/dashboard" />
        </div>
        {nav("hidden items-stretch gap-6 sm:flex")}
        <div className="ml-auto flex items-center gap-3">
          <Link href="/analyze" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New analysis</span>
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
      {nav("flex h-11 items-stretch gap-6 border-t border-iron-800 px-4 sm:hidden")}
    </header>
  );
}
