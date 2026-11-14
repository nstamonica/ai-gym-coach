"use client";

import { useSyncExternalStore } from "react";

const FORMATS = {
  date: { month: "short", day: "numeric", year: "numeric" },
  short: { month: "short", day: "numeric" },
  datetime: { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

const noSubscription = () => () => {};

/**
 * A timestamp in the viewer's own time zone and locale. The server (and the
 * hydration pass) render a fixed UTC version so the HTML matches; the local
 * version replaces it right after hydration.
 */
export function LocalDate({ iso, format = "date" }: { iso: string; format?: keyof typeof FORMATS }) {
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const date = new Date(iso);
  const text = hydrated
    ? date.toLocaleString(undefined, FORMATS[format])
    : date.toLocaleString("en-US", { ...FORMATS[format], timeZone: "UTC" });
  return <time dateTime={iso}>{text}</time>;
}
