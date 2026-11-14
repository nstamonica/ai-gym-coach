import Link from "next/link";
import { cx } from "@/lib/cx";

/** The app mark: a barbell inside a rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
      <g fill="#fff">
        <rect x="6" y="11" width="3" height="10" rx="1.5" />
        <rect x="9.5" y="13" width="2.5" height="6" rx="1.25" />
        <rect x="20" y="13" width="2.5" height="6" rx="1.25" />
        <rect x="23" y="11" width="3" height="10" rx="1.5" />
        <rect x="11" y="15" width="10" height="2" rx="1" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-2.5 rounded-lg font-bold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400",
        className,
      )}
    >
      <LogoMark />
      <span className="text-lg">AI Gym Coach</span>
    </Link>
  );
}
