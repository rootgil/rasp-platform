/** Safe relative callback paths only (no open redirect). Safe for client + server. */
export function sanitizeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return fallback;
  if (decoded.includes("\\")) return fallback;
  return decoded;
}
