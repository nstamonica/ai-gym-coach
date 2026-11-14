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

  const nav = (className: string) => (
    <nav aria-label="Main" className={className}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={cx(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive(link.href) ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
        <Logo href="/dashboard" />
        {nav("ml-4 hidden items-center gap-1 sm:flex")}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/analyze" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New analysis</span>
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
      {nav("flex items-center gap-1 border-t border-white/5 px-3 py-1.5 sm:hidden")}
    </header>
  );
}
