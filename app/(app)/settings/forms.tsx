"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { authErrorMessage } from "@/lib/auth-errors";
import { authClient } from "@/lib/auth-client";

type Status = { tone: "error" | "success"; text: string } | null;

function useFormStatus() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  return { pending, setPending, status, setStatus };
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { pending, setPending, status, setStatus } = useFormStatus();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newName = String(new FormData(event.currentTarget).get("name")).trim();
    if (!newName) return setStatus({ tone: "error", text: "Enter your name." });
    setPending(true);
    setStatus(null);
    const { error } = await authClient.updateUser({ name: newName });
    setPending(false);
    if (error) return setStatus({ tone: "error", text: authErrorMessage(error) });
    setStatus({ tone: "success", text: "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField label="Name" name="name" defaultValue={name} autoComplete="name" maxLength={80} required />
      <TextField label="Email" value={email} disabled readOnly hint="Your email can't be changed yet." />
      {status && <FormMessage tone={status.tone}>{status.text}</FormMessage>}
      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { pending, setPending, status, setStatus } = useFormStatus();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword"));
    if (newPassword.length < 8) return setStatus({ tone: "error", text: "Use at least 8 characters for your password." });
    if (newPassword !== form.get("confirm")) return setStatus({ tone: "error", text: "The new passwords don't match." });

    setPending(true);
    setStatus(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword")),
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) return setStatus({ tone: "error", text: authErrorMessage(error) });
    formElement.reset();
    setStatus({ tone: "success", text: "Password changed. Your other devices were signed out." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      <TextField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        required
        hint="At least 8 characters."
      />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      {status && <FormMessage tone={status.tone}>{status.text}</FormMessage>}
      <Button type="submit" loading={pending}>
        Change password
      </Button>
    </form>
  );
}

export function SignOutEverywhere() {
  const { pending, setPending, status, setStatus } = useFormStatus();

  async function signOutOthers() {
    setPending(true);
    setStatus(null);
    const { error } = await authClient.revokeOtherSessions();
    setPending(false);
    setStatus(
      error
        ? { tone: "error", text: authErrorMessage(error) }
        : { tone: "success", text: "Signed out of every other device." },
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={signOutOthers} loading={pending}>
        Sign out of other devices
      </Button>
      {status && <FormMessage tone={status.tone}>{status.text}</FormMessage>}
    </div>
  );
}

export function DeleteAccount({ requirePassword }: { requirePassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, setPending, status, setStatus } = useFormStatus();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("confirm")).trim().toLowerCase() !== "delete") {
      return setStatus({ tone: "error", text: 'Type "delete" to confirm.' });
    }
    setPending(true);
    setStatus(null);
    const { error } = await authClient.deleteUser(requirePassword ? { password: String(form.get("password")) } : {});
    if (error) {
      setPending(false);
      return setStatus({ tone: "error", text: authErrorMessage(error) });
    }
    router.replace("/");
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {requirePassword && (
        <TextField label="Your password" name="password" type="password" autoComplete="current-password" required />
      )}
      <TextField label='Type "delete" to confirm' name="confirm" autoComplete="off" required />
      {status && <FormMessage tone={status.tone}>{status.text}</FormMessage>}
      <div className="flex gap-3">
        <Button type="submit" variant="danger" loading={pending}>
          Permanently delete account
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
