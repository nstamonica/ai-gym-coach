"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-5 py-16 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight text-iron-50 uppercase">Something went wrong</h1>
      <p className="text-iron-400">
        We couldn&apos;t load this page. It&apos;s probably temporary; try again in a moment.
        {error.digest && <span className="mt-2 block text-xs text-iron-500">Reference: {error.digest}</span>}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
