"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SocialButtons, type Provider } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { signIn } from "@/lib/auth-client";

export function SignInForm({
  next,
  providers,
  canResetPassword,
  notice,
  initialError,
}: {
  next: string;
  providers: Provider[];
  canResetPassword: boolean;
  notice: string | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
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
      {notice && <FormMessage tone="success">{notice}</FormMessage>}
      <SocialButtons providers={providers} next={next} />
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aside={
            canResetPassword && (
              <Link href="/forgot-password" className="text-sm text-blue-300 hover:text-blue-200">
                Forgot password?
              </Link>
            )
          }
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>
    </div>
  );
}
