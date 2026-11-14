// Friendly messages for Better Auth error codes.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Check them and try again.",
  INVALID_PASSWORD: "That password isn't right.",
  INVALID_EMAIL: "Enter a valid email address.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Try signing in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Try signing in instead.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters for your password.",
  PASSWORD_TOO_LONG: "That password is too long (128 characters max).",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
  SESSION_EXPIRED: "For your security, please sign out and sign back in, then try again.",
  SESSION_NOT_FRESH: "For your security, please sign out and sign back in, then try again.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "This account signs in with GitHub or Google, so it has no password.",
};

export function authErrorMessage(
  error: { status?: number; code?: string; message?: string } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return (error.code && MESSAGES[error.code]) || error.message || fallback;
}

/** Errors Better Auth puts in the URL after a failed OAuth sign-in (?error=...). */
export function oauthErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "account_not_linked") {
    return "This email is already registered with a different sign-in method. Sign in that way first.";
  }
  return "Signing in with that provider didn't work. Please try again.";
}
