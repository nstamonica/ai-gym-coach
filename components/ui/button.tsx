import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

// Primary actions are chalk on iron. Color is reserved for meaning, so the only
// colored variant is "danger".
const VARIANTS = {
  primary: "bg-iron-100 text-iron-950 hover:bg-white active:bg-iron-200",
  secondary: "border border-iron-700 text-iron-100 hover:border-iron-500 hover:bg-iron-800/60",
  ghost: "text-iron-300 hover:bg-iron-800/70 hover:text-iron-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

const SIZES = {
  sm: "h-9 gap-1.5 rounded-md px-3 text-sm",
  md: "h-11 gap-2 rounded-md px-5 text-[0.9375rem]",
  lg: "h-12 gap-2 rounded-md px-6 text-base",
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
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100",
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
