"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminSession } from "@/lib/admin";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { createSettlementSchema, type CreateSettlementInput } from "@/lib/validation";
import { sendSettlementNudgeEmail } from "@/lib/email";
import { notifyWhatsAppSettlementRecorded, notifyWhatsAppText } from "@/lib/whatsapp-notify";
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
  const actorLedgerUserId = session.user.ledgerUserId;
  const actorIsParticipant =
    actorLedgerUserId != null &&
    (actorLedgerUserId === parsed.data.fromUser || actorLedgerUserId === parsed.data.toUser);
  if (!isAdminSession(session) && !actorIsParticipant) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: {
          type: "settlement",
          label: "settleAction",
        },
        newValue: toAuditJson({
          reason: "actor_not_participant",
          fromUser: parsed.data.fromUser,
          toUser: parsed.data.toUser,
          actorLedgerUserId,
        }),
      });
    } catch {}
    return { ok: false, error: "You can only settle your own balances unless you are super admin" };
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

export async function sendSettlementNudgeAction(input: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  tone: "friendly" | "firm" | "custom";
  channels: { inApp: boolean; whatsapp: boolean; email: boolean };
  customMessage?: string;
}): Promise<ActionResult<null>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid amount" };
  }
  if (!input.channels.inApp && !input.channels.whatsapp && !input.channels.email) {
    return { ok: false, error: "Pick at least one channel" };
  }
  const actorLedgerUserId = session.user.ledgerUserId;
  const actorIsParticipant =
    actorLedgerUserId != null &&
    (actorLedgerUserId === input.fromUserId || actorLedgerUserId === input.toUserId);
  if (!isAdminSession(session) && !actorIsParticipant) {
    return { ok: false, error: "You can only nudge for settlements you are part of" };
  }

  try {
    const [fromUser, toUser] = await Promise.all([
      getUserById(input.fromUserId),
      getUserById(input.toUserId),
    ]);
    if (!fromUser || !toUser) {
      return { ok: false, error: "User not found" };
    }
    const baseMessage =
      input.tone === "firm"
        ? `Reminder: ${fromUser.name}, please settle ₹${amount.toLocaleString("en-IN")} to ${toUser.name} today.`
        : input.tone === "custom"
          ? input.customMessage?.trim() || `Hi ${fromUser.name}, this is a reminder to settle ₹${amount.toLocaleString("en-IN")} to ${toUser.name}.`
          : `Hi ${fromUser.name}, friendly reminder to settle ₹${amount.toLocaleString("en-IN")} to ${toUser.name} when possible.`;

    if (input.channels.whatsapp) {
      notifyWhatsAppText(`🔔 Settlement nudge\n${baseMessage}`);
    }
    if (input.channels.email) {
      await sendSettlementNudgeEmail({
        to: fromUser.email,
        debtorName: fromUser.name,
        creditorName: toUser.name,
        amount,
        customMessage: input.tone === "custom" ? input.customMessage : undefined,
      });
    }

    try {
      await appendAuditLog({
        actionType: "NUDGE_SENT",
        performedBy: performerFromSession(session),
        targetEntity: {
          type: "settlement",
          label: `${fromUser.name} → ${toUser.name}`,
        },
        newValue: toAuditJson({
          amount,
          tone: input.tone,
          channels: input.channels,
          customMessage: input.tone === "custom" ? input.customMessage : undefined,
        }),
      });
    } catch (e) {
      console.error("[audit] nudge sent", e);
    }

    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not send nudge" };
  }
}
