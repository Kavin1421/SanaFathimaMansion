import type { Session } from "next-auth";

const DEFAULT_SUPER_ADMIN_EMAIL = "kkavinkumar24@gmail.com";

export function superAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase().trim();
}

export function isSuperAdminSession(session: Session | null | undefined): boolean {
  if (session?.user?.isSuperAdmin) return true;
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return false;
  return email === superAdminEmail();
}
