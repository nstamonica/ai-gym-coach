const BASE = "http://internal.invalid";

/**
 * Returns `target` if it's a path on this site, otherwise `fallback`. Used for
 * `?next=` after signing in, so a crafted link can't send people to another
 * site ("//evil.com", "/\t/evil.com", "javascript:...", ...). Parsing with URL
 * normalizes these the same way browsers do.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || !target.startsWith("/")) return fallback;
  try {
    const url = new URL(target, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
