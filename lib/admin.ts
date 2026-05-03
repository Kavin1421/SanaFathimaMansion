import type { Session } from "next-auth";
import { isSuperAdminSession } from "@/lib/super-admin";

/** @deprecated Use isSuperAdminSession — privileged ops are email-gated super admin only. */
export function isAdminSession(session: Session | null | undefined): boolean {
  return isSuperAdminSession(session);
}

export { isSuperAdminSession } from "@/lib/super-admin";
