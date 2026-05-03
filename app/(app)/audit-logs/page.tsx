import { AuditLogsPageClient } from "@/components/audit/audit-logs-page-client";
import { authOptions } from "@/lib/auth-options";
import { isSuperAdminSession } from "@/lib/super-admin";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (!isSuperAdminSession(session)) {
    redirect("/dashboard");
  }
  return <AuditLogsPageClient />;
}
