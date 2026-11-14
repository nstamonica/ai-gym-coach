"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cx } from "@/lib/cx";

export interface MenuUser {
  name: string;
  email: string;
  image?: string | null;
}

export function Avatar({ user, className }: { user: MenuUser; className?: string }) {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || user.email[0]!.toUpperCase();

  if (user.image) {
    return (
      // OAuth avatar from GitHub/Google (allowed by the CSP's img-src).
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.image} alt="" className={cx("size-9 rounded-full object-cover", className)} referrerPolicy="no-referrer" />
    );
  }
  return (
    <span
      className={cx(
        "grid size-9 place-items-center rounded-full bg-iron-800 font-display text-sm font-bold tracking-wide text-iron-100 ring-1 ring-iron-700",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function UserMenu({ user }: { user: MenuUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    rootRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace("/");
    router.refresh();
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-iron-200 hover:bg-iron-800 focus:bg-iron-800 focus:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 mt-2 w-64 rounded-md border border-iron-800 bg-iron-900 p-1.5 shadow-2xl shadow-black/60"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-iron-50">{user.name}</p>
            <p className="truncate text-sm text-iron-400">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-iron-800" />
          <Link href="/settings" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <Settings className="size-4 text-iron-400" aria-hidden />
            Settings
          </Link>
          <button type="button" role="menuitem" className={item} onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="size-4 text-iron-400" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
