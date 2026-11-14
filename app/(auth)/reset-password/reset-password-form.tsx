"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword.length < 8) return setError("Use at least 8 characters for your password.");
    if (newPassword !== form.get("confirm")) return setError("The passwords don't match.");

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace("/sign-in?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        hint="At least 8 characters."
        autoFocus
      />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Save new password
      </Button>
    </form>
  );
}
