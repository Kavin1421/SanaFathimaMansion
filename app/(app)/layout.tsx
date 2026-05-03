import { AppShell } from "@/components/layout/app-shell";
import { authOptions } from "@/lib/auth-options";
import { getHouseDisplayName } from "@/lib/house-name";
import { isSuperAdminSession } from "@/lib/super-admin";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const [houseName, session] = await Promise.all([getHouseDisplayName(), getServerSession(authOptions)]);
  const showAuditNav = isSuperAdminSession(session);
  return (
    <AppShell houseName={houseName} showAuditNav={showAuditNav}>
      {children}
    </AppShell>
  );
}
