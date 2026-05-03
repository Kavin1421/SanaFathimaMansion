"use server";

import { revalidatePath } from "next/cache";
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "@/lib/validation";
import { notifyWhatsAppExpense } from "@/lib/whatsapp-notify";
import { createExpense, deleteExpense, updateExpense } from "@/services/expenses";
import type { ActionResult } from "./users";

export async function createExpenseAction(
  input: CreateExpenseInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createExpense>>>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createExpense(parsed.data);
    notifyWhatsAppExpense(data, "created");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not create expense" };
  }
}

export async function updateExpenseAction(
  input: UpdateExpenseInput,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateExpense>>>>> {
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await updateExpense(parsed.data);
    if (!data) return { ok: false, error: "Expense not found" };
    notifyWhatsAppExpense(data, "updated");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not update expense" };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult<null>> {
  try {
    const ok = await deleteExpense(id);
    if (!ok) return { ok: false, error: "Expense not found" };
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not delete expense" };
  }
}
