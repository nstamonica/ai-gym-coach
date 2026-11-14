import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500",
  secondary: "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-white",
  ghost: "text-slate-300 hover:bg-slate-800/70 hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-500",
} as const;

const SIZES = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-5 text-sm",
  lg: "h-14 gap-2 rounded-xl px-6 text-base",
} as const;

export interface ButtonStyle {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Button styles, also used for links that look like buttons. */
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyle = {}): string {
  return cx(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
