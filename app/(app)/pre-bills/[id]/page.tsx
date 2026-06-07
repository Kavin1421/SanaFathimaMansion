import { PreBillDetailClient } from "@/components/pre-bills/pre-bill-detail-client";
import { authOptions } from "@/lib/auth-options";
import { isHouseAdminSession } from "@/lib/admin";
import { getPreBillById } from "@/services/pre-bills";
import { getUserById } from "@/services/users";
import { getServerSession } from "next-auth";

export default async function PreBillDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const preBill = await getPreBillById(params.id);
  const creator = preBill ? await getUserById(preBill.createdBy) : null;
  const ledgerId = session?.user?.ledgerUserId ?? null;

  return (
    <PreBillDetailClient
      id={params.id}
      initialData={preBill}
      creatorName={creator?.name ?? "Unknown"}
      currentUserLedgerId={ledgerId}
      isSuperAdmin={isHouseAdminSession(session)}
    />
  );
}
