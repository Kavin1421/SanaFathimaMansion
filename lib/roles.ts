import type { Session } from "next-auth";
import { isSuperAdminSession } from "@/lib/super-admin";

/** Household admin: can manage roommates, budget, and moderation. */
export function isHouseAdminSession(session: Session | null | undefined): boolean {
  if (!session?.user?.id) return false;
  if (isSuperAdminSession(session)) return true;
  return session.user.role === "admin";
}

export type SessionUserLike = {
  role?: "admin" | "user";
  isSuperAdmin?: boolean;
} | null | undefined;

export function isHouseAdminUser(user: SessionUserLike): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.role === "admin";
}

export function roleLabel(user: SessionUserLike & { email?: string }, isSuperAdminFlag?: boolean): string {
  if (isSuperAdminFlag || user?.isSuperAdmin) return "Super Admin";
  if (user?.role === "admin") return "Admin";
  return "Member";
}
