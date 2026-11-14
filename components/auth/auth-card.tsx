import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-iron-800 bg-iron-900 p-6 sm:p-8">
      <h1 className="font-display text-4xl leading-none font-bold tracking-tight text-iron-50 uppercase">{title}</h1>
      {subtitle && <p className="mt-2 text-iron-400">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}
