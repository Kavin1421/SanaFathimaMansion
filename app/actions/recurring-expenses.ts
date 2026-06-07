"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminSession } from "@/lib/admin";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { createRecurringExpenseSchema, type CreateRecurringExpenseInput } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import {
  createRecurringExpense,
  deleteRecurringExpense,
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
    const ok = await deleteRecurringExpense(id);
    if (!ok) return { ok: false, error: "Recurring expense not found" };
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
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not post recurring expense" };
  }
}
