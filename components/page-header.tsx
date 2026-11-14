import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-balance text-iron-50 uppercase sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-iron-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** A section title inside a page, e.g. "Recent form checks". */
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-2xl leading-tight font-bold tracking-tight text-iron-50 uppercase">
      {children}
    </h2>
  );
}
