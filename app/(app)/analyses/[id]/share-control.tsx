"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useId, useState, useSyncExternalStore, useTransition } from "react";
import { cx } from "@/lib/cx";
import { setSharingAction } from "../actions";

const noSubscription = () => () => {};

/** Turns a public, read-only link to this analysis on or off. */
export function ShareControl({ id, initialToken }: { id: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labelId = useId();
  // The site's own origin; empty during server rendering.
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "",
  );

  const shared = token !== null;
  const url = token ? `${origin}/share/${token}` : "";

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setSharingAction(id, !shared);
        setToken(result.token);
        setCopied(false);
      } catch {
        setError("Couldn't update sharing. Please try again.");
      }
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-3 rounded-lg border border-iron-800 bg-iron-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id={labelId} className="label-caps flex items-center gap-2 text-iron-200">
            <Link2 className="size-4 text-iron-400" aria-hidden />
            Share link
          </h2>
          <p className="mt-1 text-sm text-iron-400">
            {shared ? "Anyone with the link can view this review." : "Only you can see this review."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shared}
          aria-labelledby={labelId}
          onClick={toggle}
          disabled={pending}
          className={cx(
            "relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100 disabled:opacity-60",
            shared ? "bg-iron-100" : "bg-iron-700",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 left-0.5 size-5 rounded-full shadow transition",
              shared ? "translate-x-5 bg-iron-950" : "bg-iron-200",
            )}
          />
        </button>
      </div>

      {shared && origin && (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
            className="h-9 min-w-0 flex-1 rounded-md border border-iron-700 bg-iron-950/70 px-2.5 text-sm text-iron-300 focus:border-iron-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-iron-700 px-3 text-sm font-semibold text-iron-100 transition hover:border-iron-500 hover:bg-iron-800/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100"
          >
            {copied ? <Check className="size-4 text-emerald-400" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {shared && (
        <p className="text-xs text-iron-400">Your notes stay private. Turning sharing off breaks the link for good.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
