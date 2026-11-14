import "server-only";

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * True when emails can actually reach people. Password reset needs this, so the
 * "Forgot password?" link only shows when it's on. In development, emails are
 * printed to the server console instead, so the flow still works locally.
 */
export const emailEnabled = Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";

/** Sends an email with Resend (https://resend.com) or, in development, prints it to the console. */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set, so emails can't be sent.");
    }
    console.info(`\n[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "AI Gym Coach <onboarding@resend.dev>",
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend rejected the email (${res.status}): ${await res.text()}`);
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function passwordResetEmail(name: string, url: string): Omit<Email, "to"> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Reset your AI Gym Coach password",
    text: `${greeting}\n\nUse this link to choose a new password. It expires in one hour.\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>${escapeHtml(greeting)}</p>
<p>Use the button below to choose a new password. It expires in one hour.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">Reset password</a></p>
<p style="color:#64748b;font-size:13px">If you didn't ask for this, you can ignore this email.</p>`,
  };
}
