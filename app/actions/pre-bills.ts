"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import {
  createPreBillSchema,
  deletePreBillSchema,
  duplicatePreBillSchema,
  finalizePreBillSchema,
  linkPreBillExpenseSchema,
  updatePreBillSchema,
  type CreatePreBillInput,
  type DeletePreBillInput,
  type FinalizePreBillInput,
  type LinkPreBillExpenseInput,
  type UpdatePreBillInput,
} from "@/lib/validation";
import { notifyTelegramPreBillEdited, notifyTelegramPreBillFinalized } from "@/lib/telegram-notify";
import { appendAuditLog } from "@/services/audit-log";
import {
  createPreBill,
  deletePreBill,
  duplicatePreBill,
  finalizePreBill,
  getPreBillById,
  linkExpenseToPreBill,
  updateFinalizedPreBill,
  updatePreBill,
} from "@/services/pre-bills";
import { User } from "@/models/User";
import type { ActionResult } from "./users";

async function requireLedgerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const ledgerUserId = session.user.ledgerUserId ?? null;
  if (!ledgerUserId) return null;
  return { session, ledgerUserId };
}

export async function createPreBillAction(
  input: CreatePreBillInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createPreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "preBill", label: "createPreBillAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized — link your account to a household member first" };
  }
  const parsed = createPreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createPreBill(parsed.data, ctx.ledgerUserId);
    try {
      await appendAuditLog({
        actionType: "CREATE_PRE_BILL",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: data._id, label: data.title },
        newValue: toAuditJson(data),
      });
    } catch {}
    revalidatePath("/pre-bills");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not create pre-bill" };
  }
}

export async function updateFinalizedPreBillAction(
  input: UpdatePreBillInput,
): Promise<ActionResult<Awaited<ReturnType<typeof updateFinalizedPreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = updatePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await updateFinalizedPreBill(
      parsed.data,
      ctx.ledgerUserId,
      isAdminSession(ctx.session),
    );
    if (!data) return { ok: false, error: "Pre-bill not found" };
    try {
      await appendAuditLog({
        actionType: "UPDATE_FINALIZED_PRE_BILL",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: data._id, label: data.title },
        newValue: toAuditJson(data),
      });
    } catch {}
    revalidatePath("/pre-bills");
    revalidatePath(`/pre-bills/${parsed.data.id}`);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update finalized pre-bill",
    };
  }
}

/** Push current saved pre-bill to Telegram (does not change data). */
export async function notifyFinalizedPreBillTelegramAction(
  input: FinalizePreBillInput,
): Promise<ActionResult<{ sent: true }>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = finalizePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await getPreBillById(parsed.data.id);
    if (!data) return { ok: false, error: "Pre-bill not found" };
    if (data.status !== "finalized") {
      return { ok: false, error: "Only finalized pre-bills can be sent to Telegram" };
    }
    const owner = data.createdBy;
    if (!isAdminSession(ctx.session) && owner !== ctx.ledgerUserId) {
      return { ok: false, error: "You can only notify for your own pre-bill" };
    }
    const editorName =
      ctx.session.user?.name?.trim() ||
      ctx.session.user?.email?.trim() ||
      "Someone";
    notifyTelegramPreBillEdited(data, editorName, new Date());
    return { ok: true, data: { sent: true } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not notify Telegram" };
  }
}

export async function updatePreBillAction(
  input: UpdatePreBillInput,
): Promise<ActionResult<Awaited<ReturnType<typeof updatePreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = updatePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await updatePreBill(parsed.data, ctx.ledgerUserId, isAdminSession(ctx.session));
    if (!data) return { ok: false, error: "Pre-bill not found" };
    revalidatePath("/pre-bills");
    revalidatePath(`/pre-bills/${parsed.data.id}`);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save pre-bill" };
  }
}

export async function finalizePreBillAction(
  input: { id: string },
): Promise<ActionResult<Awaited<ReturnType<typeof finalizePreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = finalizePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await finalizePreBill(parsed.data.id, ctx.ledgerUserId, isAdminSession(ctx.session));
    if (!data) return { ok: false, error: "Pre-bill not found" };

    const creator = await User.findById(data.createdBy).select("name").lean();
    const creatorName = creator?.name ?? "Someone";
    notifyTelegramPreBillFinalized(data, creatorName, new Date(data.updatedAt));

    try {
      await appendAuditLog({
        actionType: "FINALIZE_PRE_BILL",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: data._id, label: data.title },
        newValue: toAuditJson({ status: data.status }),
      });
    } catch {}

    revalidatePath("/pre-bills");
    revalidatePath(`/pre-bills/${data._id}`);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not finalize pre-bill" };
  }
}

export async function deletePreBillAction(
  input: DeletePreBillInput,
): Promise<ActionResult<{ deleted: boolean }>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = deletePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const ok = await deletePreBill(
      parsed.data.id,
      ctx.session.user?.email,
      isAdminSession(ctx.session),
    );
    if (!ok) return { ok: false, error: "Pre-bill not found" };
    try {
      await appendAuditLog({
        actionType: "DELETE_PRE_BILL",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: parsed.data.id },
      });
    } catch {}
    revalidatePath("/pre-bills");
    revalidatePath(`/pre-bills/${parsed.data.id}`);
    return { ok: true, data: { deleted: true } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete pre-bill" };
  }
}

export async function duplicatePreBillAction(
  input: { id: string },
): Promise<ActionResult<Awaited<ReturnType<typeof duplicatePreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = duplicatePreBillSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await duplicatePreBill(parsed.data.id, ctx.ledgerUserId);
    if (!data) return { ok: false, error: "Pre-bill not found" };
    try {
      await appendAuditLog({
        actionType: "DUPLICATE_PRE_BILL",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: data._id, label: data.title },
        newValue: toAuditJson({ sourceId: parsed.data.id }),
      });
    } catch {}
    revalidatePath("/pre-bills");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not duplicate" };
  }
}

export async function linkPreBillExpenseAction(
  input: LinkPreBillExpenseInput,
): Promise<ActionResult<Awaited<ReturnType<typeof linkExpenseToPreBill>>>> {
  const ctx = await requireLedgerSession();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = linkPreBillExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await linkExpenseToPreBill(
      parsed.data.preBillId,
      parsed.data.expenseId,
      ctx.ledgerUserId,
      isAdminSession(ctx.session),
    );
    if (!data) return { ok: false, error: "Pre-bill not found" };
    try {
      await appendAuditLog({
        actionType: "LINK_PRE_BILL_EXPENSE",
        performedBy: performerFromSession(ctx.session),
        targetEntity: { type: "preBill", id: data._id, label: data.title },
        newValue: toAuditJson({ expenseId: parsed.data.expenseId }),
      });
    } catch {}
    revalidatePath("/pre-bills");
    revalidatePath(`/pre-bills/${data._id}`);
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not link expense" };
  }
}
