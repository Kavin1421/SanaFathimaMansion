"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import { appendAuditLog } from "@/services/audit-log";
import { getUserById } from "@/services/users";
import type { ActionResult } from "./users";

/** Direct balance override; next full expense recompute will refresh from ledger. */
export async function adminOverrideBalanceAction(
  userId: string,
  balance: number,
  totalPaid?: number,
): Promise<ActionResult<null>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "user", id: userId, label: "adminOverrideBalanceAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: userId, label: "adminOverrideBalanceAction" },
      });
    } catch {}
    return { ok: false, error: "Super admin only" };
  }
  if (!Number.isFinite(balance)) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: userId, label: "adminOverrideBalanceAction" },
        newValue: toAuditJson({ balance, totalPaid }),
      });
    } catch {}
    return { ok: false, error: "Invalid balance" };
  }
  try {
    const before = await getUserById(userId);
    await connectDb();
    const patch: { balance: number; totalPaid?: number } = { balance };
    if (totalPaid !== undefined && Number.isFinite(totalPaid)) {
      patch.totalPaid = totalPaid;
    }
    const r = await User.findByIdAndUpdate(userId, patch);
    if (!r) return { ok: false, error: "User not found" };
    try {
      await appendAuditLog({
        actionType: "UPDATE_USER",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: userId, label: before?.name ?? userId },
        previousValue: toAuditJson(before),
        newValue: toAuditJson({
          kind: "balance_override",
          balance,
          totalPaid: totalPaid !== undefined && Number.isFinite(totalPaid) ? totalPaid : undefined,
        }),
      });
    } catch (e) {
      console.error("[audit] balance override", e);
    }
    console.info("[admin] balance override", { userId, balance, totalPaid });
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: userId, label: "adminOverrideBalanceAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not update balance" };
  }
}
