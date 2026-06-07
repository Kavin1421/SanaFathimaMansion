import { connectDb } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import type { WalletAmendmentDTO } from "@/types";

export async function listWalletAmendments(monthKey?: string): Promise<WalletAmendmentDTO[]> {
  await connectDb();
  const q: Record<string, unknown> = {
    actionType: "UPDATE_BUDGET",
    "newValue.amend": true,
  };
  if (monthKey) {
    q["targetEntity.id"] = monthKey;
  }

  const rows = await AuditLog.find(q).sort({ createdAt: -1 }).limit(200).lean();

  return rows.map((r) => {
    const nv = (r.newValue ?? {}) as Record<string, unknown>;
    const month = String(nv.monthKey ?? r.targetEntity?.id ?? "");
    return {
      id: String(r._id),
      monthKey: month,
      previousBudget: Number(nv.previousBudget ?? 0),
      additionalAmount: Number(nv.additionalAmount ?? 0),
      newBudget: Number(nv.budget ?? 0),
      performedByName: r.performedBy?.name ?? r.performedBy?.email ?? "Unknown",
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    };
  });
}
