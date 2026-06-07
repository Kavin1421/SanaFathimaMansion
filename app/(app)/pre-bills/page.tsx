import { PreBillsListClient } from "@/components/pre-bills/pre-bills-list-client";
import { authOptions } from "@/lib/auth-options";
import { isHouseAdminSession } from "@/lib/admin";
import { getServerSession } from "next-auth";

export default async function PreBillsPage() {
  const session = await getServerSession(authOptions);
  const ledgerId = session?.user?.ledgerUserId ?? null;
  if (!ledgerId) {
    return (
      <div className="rounded-2xl border p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Link your account to a household member on the Users page to create pre-bills.
        </p>
      </div>
    );
  }
  return (
    <PreBillsListClient
      currentUserId={ledgerId}
      userEmail={session?.user?.email ?? null}
      isSuperAdmin={isHouseAdminSession(session)}
    />
  );
}
