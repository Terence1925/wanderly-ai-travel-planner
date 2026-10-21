/**
 * Returns a same-origin path for post-login redirects, or the fallback.
 * Parsing with URL (instead of prefix checks) catches tricks like "/\evil.com",
 * which browsers normalise to "//evil.com". The normalised path is checked again
 * because dot segments can produce one too: "/.//evil.com" becomes "//evil.com".
 */
export function safeRedirectPath(next: string | null, origin: string, fallback = "/trips"): string {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const url = new URL(next, origin);
    const path = `${url.pathname}${url.search}${url.hash}`;
    const isSameOrigin = url.origin === origin;
    const isProtocolRelative = path.startsWith("//") || path.startsWith("/\\");
    return isSameOrigin && !isProtocolRelative ? path : fallback;
  } catch {
    return fallback;
  }
}
