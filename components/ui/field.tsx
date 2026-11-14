import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

const CONTROL =
  "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 text-slate-100 placeholder:text-slate-500 transition " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  /** Shown under the field and announced to screen readers. */
  error?: string | null;
  /** Extra content on the label row, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  aside,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-200">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        className={cx(CONTROL, "h-11", error && "border-red-500/70")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  aside,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-200">
          {label}
        </label>
        {aside}
      </div>
      <textarea
        id={id}
        className={cx(CONTROL, "min-h-20 resize-y py-2.5", error && "border-red-500/70")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}

function FieldMessage({ id, hint, error }: { id: string; hint?: ReactNode; error?: string | null }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm text-red-300">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-sm text-slate-400">
        {hint}
      </p>
    );
  }
  return null;
}

/** A form-level message: an error (role="alert") or a success notice. */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      )}
    >
      {children}
    </p>
  );
}
