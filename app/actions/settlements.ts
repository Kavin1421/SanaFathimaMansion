"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { createSettlementSchema, type CreateSettlementInput } from "@/lib/validation";
import { notifyWhatsAppSettlementRecorded } from "@/lib/whatsapp-notify";
import { appendAuditLog } from "@/services/audit-log";
import { recordCompletedSettlement } from "@/services/settlements";
import { getUserById } from "@/services/users";
import type { ActionResult } from "./users";

export async function settleAction(
  input: CreateSettlementInput,
): Promise<ActionResult<Awaited<ReturnType<typeof recordCompletedSettlement>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "settlement", label: "settleAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = createSettlementSchema.safeParse(input);
  if (!parsed.success) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "settlement", label: "settleAction" },
        newValue: toAuditJson({ issues: parsed.error.issues }),
      });
    } catch {}
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await recordCompletedSettlement(parsed.data);
    try {
      const [fromUser, toUser] = await Promise.all([
        getUserById(parsed.data.fromUser),
        getUserById(parsed.data.toUser),
      ]);
      await appendAuditLog({
        actionType: "CREATE_SETTLEMENT",
        performedBy: performerFromSession(session),
        targetEntity: {
          type: "settlement",
          id: data._id,
          label: `${fromUser?.name ?? "?"} → ${toUser?.name ?? "?"}`,
        },
        newValue: toAuditJson({
          ...data,
          fromUserName: fromUser?.name,
          toUserName: toUser?.name,
        }),
      });
    } catch (e) {
      console.error("[audit] create settlement", e);
    }
    notifyWhatsAppSettlementRecorded(
      parsed.data.fromUser,
      parsed.data.toUser,
      parsed.data.amount,
    );
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "settlement", label: "settleAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not record settlement" };
  }
}
