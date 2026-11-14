import Link from "next/link";
import { cx } from "@/lib/cx";

/** The app mark: a loaded barbell on a chalk tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#f0ece7" />
      <g fill="#100e0c">
        <rect x="5" y="9.5" width="3.5" height="13" rx="1" />
        <rect x="9.5" y="12" width="3" height="8" rx="1" />
        <rect x="19.5" y="12" width="3" height="8" rx="1" />
        <rect x="23.5" y="9.5" width="3.5" height="13" rx="1" />
        <rect x="12" y="15" width="8" height="2" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-2.5 rounded-md text-iron-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iron-100",
        className,
      )}
    >
      <LogoMark />
      <span className="font-display text-xl leading-none font-bold tracking-wide uppercase">AI Gym Coach</span>
    </Link>
  );
}
