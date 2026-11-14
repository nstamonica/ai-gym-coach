"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setSent(true);
  }

  if (sent) {
    // Same message whether or not the account exists, so this can't be used to probe for emails.
    return (
      <FormMessage tone="success">
        If an account exists for that email, a reset link is on its way. It expires in one hour.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
