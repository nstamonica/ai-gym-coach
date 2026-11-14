"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SocialButtons, type Provider } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { signUp } from "@/lib/auth-client";

export function SignUpForm({ next, providers }: { next: string; providers: Provider[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      password,
    });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <SocialButtons providers={providers} next={next} />
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Name" name="name" autoComplete="name" required maxLength={80} autoFocus />
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          hint="At least 8 characters."
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
        <p className="text-center text-xs leading-relaxed text-slate-400">
          By creating an account you agree that AI feedback can be wrong and isn&apos;t medical advice. See how we
          handle your videos in our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-200">
            privacy notes
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
