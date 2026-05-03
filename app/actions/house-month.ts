"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminSession } from "@/lib/admin";
import { nextMonthKey } from "@/lib/dates";
import { notifyWhatsAppMonthReset } from "@/lib/whatsapp-notify";
import { upsertHouseMonthBudget } from "@/services/house-month";
import type { ActionResult } from "./users";

export async function setMonthBudgetAction(
  monthKey: string,
  budget: number,
): Promise<ActionResult<{ monthKey: string; budget: number }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    return { ok: false, error: "Only an admin can set the budget" };
  }
  if (!monthKey.match(/^\d{4}-\d{2}$/) || budget < 0 || !Number.isFinite(budget)) {
    return { ok: false, error: "Invalid month or budget" };
  }
  try {
    await upsertHouseMonthBudget({ monthKey, budget });
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data: { monthKey, budget } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not save budget" };
  }
}

export async function startNewMonthAction(
  currentMonthKey: string,
  nextBudget: number,
  carryForwardBalances: boolean,
): Promise<ActionResult<{ nextMonthKey: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    return { ok: false, error: "Only an admin can start a new month" };
  }
  const next = nextMonthKey(currentMonthKey);
  if (nextBudget < 0 || !Number.isFinite(nextBudget)) {
    return { ok: false, error: "Invalid budget" };
  }
  try {
    await upsertHouseMonthBudget({
      monthKey: next,
      budget: nextBudget,
      carryForwardBalances,
    });
    notifyWhatsAppMonthReset(next, nextBudget, { carryForwardBalances });
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data: { nextMonthKey: next } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not start new month" };
  }
}
