import type { Session } from "next-auth";

export function isAdminSession(session: Session | null | undefined): boolean {
  return session?.user?.role === "admin";
}
