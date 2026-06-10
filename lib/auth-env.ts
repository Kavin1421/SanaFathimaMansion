/** Canonical app URL for NextAuth cookies and redirects. */
export function authBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** True when session cookies must use the Secure / __Secure- prefix (HTTPS). */
export function isSecureAuthCookies(): boolean {
  if (process.env.NEXTAUTH_URL?.trim()) {
    return authBaseUrl().startsWith("https://");
  }
  return process.env.NODE_ENV === "production";
}

export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days
