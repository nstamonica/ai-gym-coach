"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { signIn } from "@/lib/auth-client";

export type Provider = "github" | "google";

const LABELS: Record<Provider, string> = { github: "GitHub", google: "Google" };

/** "Continue with GitHub / Google" for whichever providers the server has configured. */
export function SocialButtons({ providers, next }: { providers: Provider[]; next: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function continueWith(provider: Provider) {
    setPending(provider);
    setError(null);
    const { error } = await signIn.social({
      provider,
      callbackURL: next,
      errorCallbackURL: "/sign-in",
    });
    // On success the browser is already navigating to the provider.
    if (error) {
      setError(authErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          className="w-full"
          loading={pending === provider}
          disabled={pending !== null}
          onClick={() => continueWith(provider)}
        >
          {pending !== provider && <ProviderIcon provider={provider} />}
          Continue with {LABELS[provider]}
        </Button>
      ))}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex items-center gap-3 pt-1 text-xs tracking-wider text-slate-500 uppercase">
        <span className="h-px flex-1 bg-slate-800" />
        or
        <span className="h-px flex-1 bg-slate-800" />
      </div>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "github") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.65Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}
