"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "@/lib/validation";
import { notifyTelegramExpense } from "@/lib/telegram-notify";
import { appendAuditLog } from "@/services/audit-log";
import {
  addExpenseComment,
  createExpense,
  deleteExpense,
  getExpenseById,
  toggleExpenseReaction,
  updateExpense,
} from "@/services/expenses";
import type { ActionResult } from "./users";

async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

export async function createExpenseAction(
  input: CreateExpenseInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createExpense>>>> {
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "expense", label: "createExpenseAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", label: "createExpenseAction" },
        newValue: toAuditJson({ issues: parsed.error.issues }),
      });
    } catch {}
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createExpense(parsed.data);
    try {
      await appendAuditLog({
        actionType: "CREATE_EXPENSE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id: data._id, label: data.title },
        newValue: toAuditJson(data),
      });
    } catch (e) {
      console.error("[audit] create expense", e);
    }
    notifyTelegramExpense(data, "created");
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
        targetEntity: { type: "expense", label: "createExpenseAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not create expense" };
  }
}

export async function updateExpenseAction(
  input: UpdateExpenseInput,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateExpense>>>>> {
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "expense", id: input.id, label: "updateExpenseAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id: input.id, label: "updateExpenseAction" },
        newValue: toAuditJson({ issues: parsed.error.issues }),
      });
    } catch {}
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const before = await getExpenseById(parsed.data.id);
    if (!before) return { ok: false, error: "Expense not found" };
    const actorLedgerUserId = session.user.ledgerUserId ?? null;
    const canEdit = isAdminSession(session) || (actorLedgerUserId != null && actorLedgerUserId === before.paidBy);
    if (!canEdit) {
      try {
        await appendAuditLog({
          actionType: "ACCESS_DENIED",
          performedBy: performerFromSession(session),
          targetEntity: { type: "expense", id: parsed.data.id, label: "updateExpenseAction" },
          newValue: toAuditJson({ reason: "not_owner_or_admin", actorLedgerUserId, paidBy: before.paidBy }),
        });
      } catch {}
      return { ok: false, error: "Only super admin or expense owner can edit this expense" };
    }
    const data = await updateExpense(parsed.data);
    if (!data) return { ok: false, error: "Expense not found" };
    try {
      await appendAuditLog({
        actionType: "UPDATE_EXPENSE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id: data._id, label: data.title },
        previousValue: toAuditJson(before),
        newValue: toAuditJson(data),
      });
    } catch (e) {
      console.error("[audit] update expense", e);
    }
    notifyTelegramExpense(data, "updated");
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
        targetEntity: { type: "expense", id: input.id, label: "updateExpenseAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    const msg = e instanceof Error ? e.message : "Could not update expense";
    return { ok: false, error: msg };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult<null>> {
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "expense", id, label: "deleteExpenseAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id, label: "deleteExpenseAction" },
      });
    } catch {}
    return { ok: false, error: "Only a super admin can delete expenses" };
  }
  try {
    const before = await getExpenseById(id);
    const ok = await deleteExpense(id);
    if (!ok) return { ok: false, error: "Expense not found" };
    try {
      await appendAuditLog({
        actionType: "DELETE_EXPENSE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id, label: before?.title },
        previousValue: toAuditJson(before),
      });
    } catch (e) {
      console.error("[audit] delete expense", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id, label: "deleteExpenseAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not delete expense" };
  }
}

export async function addExpenseCommentAction(input: {
  expenseId: string;
  text: string;
}): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof addExpenseComment>>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const text = input.text.trim();
  if (text.length < 1) return { ok: false, error: "Comment cannot be empty" };
  if (text.length > 800) return { ok: false, error: "Comment too long" };
  try {
    const data = await addExpenseComment({
      expenseId: input.expenseId,
      accountId: session.user.id,
      authorName: session.user.name ?? "User",
      text,
    });
    if (!data) return { ok: false, error: "Expense not found" };
    try {
      await appendAuditLog({
        actionType: "ADD_EXPENSE_COMMENT",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id: data._id, label: data.title },
        newValue: toAuditJson({ commentBy: session.user.name, text }),
      });
    } catch {}
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add comment" };
  }
}

export async function toggleExpenseReactionAction(input: {
  expenseId: string;
  emoji: string;
}): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof toggleExpenseReaction>>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const emoji = input.emoji.trim();
  if (!emoji) return { ok: false, error: "Emoji required" };
  try {
    const data = await toggleExpenseReaction({
      expenseId: input.expenseId,
      accountId: session.user.id,
      authorName: session.user.name ?? "User",
      emoji,
    });
    if (!data) return { ok: false, error: "Expense not found" };
    try {
      await appendAuditLog({
        actionType: "TOGGLE_EXPENSE_REACTION",
        performedBy: performerFromSession(session),
        targetEntity: { type: "expense", id: data._id, label: data.title },
        newValue: toAuditJson({ emoji }),
      });
    } catch {}
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update reaction" };
  }
}
