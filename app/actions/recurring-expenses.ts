"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminSession } from "@/lib/admin";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { createRecurringExpenseSchema, type CreateRecurringExpenseInput } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { notifyHousehold, notifyTelegramExpense } from "@/lib/telegram-notify";
import { formatInr } from "@/lib/utils";
import { getExpenseById } from "@/services/expenses";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenseById,
  postRecurring,
  updateRecurringExpense,
} from "@/services/recurring-expenses";
import type { ActionResult } from "./users";

async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

export async function createRecurringExpenseAction(
  input: CreateRecurringExpenseInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createRecurringExpense>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (!isAdminSession(session)) return { ok: false, error: "Only an admin can create recurring expenses" };
  const parsed = createRecurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createRecurringExpense({
      ...parsed.data,
      createdBy: session.user.id,
    });
    await notifyHousehold({
      heading: "Recurring expense added",
      title: data.title,
      lines: [formatInr(data.amount), data.category, `Day ${data.dayOfMonth} of each month`],
      path: "/dashboard",
      icon: "🔁",
      eventType: "telegram_recurring_created",
      dedupeKey: `recurring:${data._id}:created`,
      metadata: { recurringId: data._id },
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create recurring expense" };
  }
}

export async function updateRecurringExpenseAction(input: {
  id: string;
  title?: string;
  amount?: number;
  category?: CreateRecurringExpenseInput["category"];
  paidBy?: string;
  splitEnabled?: boolean;
  splitMode?: "equal" | "custom";
  splitBetween?: string[];
  dayOfMonth?: number;
  active?: boolean;
}): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateRecurringExpense>>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (!isAdminSession(session)) return { ok: false, error: "Only an admin can update recurring expenses" };
  try {
    const data = await updateRecurringExpense(input);
    if (!data) return { ok: false, error: "Recurring expense not found" };
    await notifyHousehold({
      heading: "Recurring expense updated",
      title: data.title,
      lines: [
        formatInr(data.amount),
        data.category,
        `Day ${data.dayOfMonth} of each month`,
        data.active ? "Active" : "Paused",
      ],
      path: "/dashboard",
      icon: "🔁",
      eventType: "telegram_recurring_updated",
      metadata: { recurringId: data._id },
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update recurring expense" };
  }
}

export async function deleteRecurringExpenseAction(id: string): Promise<ActionResult<null>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (!isAdminSession(session)) return { ok: false, error: "Only an admin can delete recurring expenses" };
  try {
    const before = await getRecurringExpenseById(id);
    const ok = await deleteRecurringExpense(id);
    if (!ok) return { ok: false, error: "Recurring expense not found" };
    if (before) {
      await notifyHousehold({
        heading: "Recurring expense removed",
        title: before.title,
        lines: [formatInr(before.amount), `Removed by ${session.user.name ?? "Someone"}`],
        path: "/dashboard",
        icon: "🔁",
        eventType: "telegram_recurring_deleted",
        dedupeKey: `recurring:${before._id}:deleted`,
        metadata: { recurringId: before._id },
      });
    }
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete recurring expense" };
  }
}

export async function postRecurringExpenseAction(input: {
  id: string;
  monthKey: string;
}): Promise<ActionResult<{ recurring: Awaited<ReturnType<typeof updateRecurringExpense>>; expenseId: string }>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (!isAdminSession(session)) return { ok: false, error: "Only an admin can post recurring expenses" };
  if (!input.monthKey.match(/^\d{4}-\d{2}$/)) {
    return { ok: false, error: "Invalid month key" };
  }
  try {
    const result = await postRecurring(input.id, input.monthKey);
    if (!result) return { ok: false, error: "Recurring expense not found" };
    try {
      await appendAuditLog({
        actionType: "RECURRING_EXPENSE_POSTED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "recurring_expense", id: result.recurring._id, label: result.recurring.title },
        newValue: toAuditJson({ monthKey: input.monthKey, expenseId: result.expenseId }),
      });
    } catch (e) {
      console.error("[audit] recurring posted", e);
    }
    const expense = await getExpenseById(result.expenseId);
    if (expense) {
      await notifyTelegramExpense(expense, "created");
    }
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not post recurring expense" };
  }
}
