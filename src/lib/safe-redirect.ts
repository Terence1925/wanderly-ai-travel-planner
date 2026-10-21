/**
 * Returns a same-origin path for post-login redirects, or the fallback.
 * Parsing with URL (instead of prefix checks) catches tricks like "/\evil.com",
 * which browsers normalise to "//evil.com".
 */
export function safeRedirectPath(next: string | null, origin: string, fallback = "/trips"): string {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
