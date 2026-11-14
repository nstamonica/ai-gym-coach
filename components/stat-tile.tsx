import type { ReactNode } from "react";

/** A headline number: label, value and an optional line of context. */
export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-4 sm:p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail && <p className="mt-1 text-sm text-pretty text-slate-400">{detail}</p>}
    </div>
  );
}
