import type { Session } from "next-auth";
import { isHouseAdminSession } from "@/lib/roles";
import { isSuperAdminSession } from "@/lib/super-admin";

/** Household-level privileged operations (users, budget, expense moderation). */
export function isAdminSession(session: Session | null | undefined): boolean {
  return isHouseAdminSession(session);
}

export { isHouseAdminSession, isHouseAdminUser, roleLabel } from "@/lib/roles";
export { isSuperAdminSession } from "@/lib/super-admin";
