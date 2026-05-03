"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import { nextMonthKey } from "@/lib/dates";
import { notifyWhatsAppMonthReset } from "@/lib/whatsapp-notify";
import { appendAuditLog } from "@/services/audit-log";
import { getHouseMonthByKey, upsertHouseMonthBudget } from "@/services/house-month";
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
    return { ok: false, error: "Only a super admin can set the budget" };
  }
  if (!monthKey.match(/^\d{4}-\d{2}$/) || budget < 0 || !Number.isFinite(budget)) {
    return { ok: false, error: "Invalid month or budget" };
  }
  try {
    const prevDoc = await getHouseMonthByKey(monthKey);
    await upsertHouseMonthBudget({ monthKey, budget });
    try {
      await appendAuditLog({
        actionType: "UPDATE_BUDGET",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: monthKey },
        previousValue: toAuditJson(
          prevDoc
            ? { monthKey: prevDoc.monthKey, budget: prevDoc.budget, carryForwardBalances: prevDoc.carryForwardBalances }
            : null,
        ),
        newValue: toAuditJson({ monthKey, budget }),
      });
    } catch (e) {
      console.error("[audit] update budget", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
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
    return { ok: false, error: "Only a super admin can start a new month" };
  }
  const next = nextMonthKey(currentMonthKey);
  if (nextBudget < 0 || !Number.isFinite(nextBudget)) {
    return { ok: false, error: "Invalid budget" };
  }
  try {
    const prevNext = await getHouseMonthByKey(next);
    await upsertHouseMonthBudget({
      monthKey: next,
      budget: nextBudget,
      carryForwardBalances,
    });
    try {
      await appendAuditLog({
        actionType: "RESET_MONTH",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: next, label: `from ${currentMonthKey} → ${next}` },
        previousValue: toAuditJson(
          prevNext
            ? {
                monthKey: prevNext.monthKey,
                budget: prevNext.budget,
                carryForwardBalances: prevNext.carryForwardBalances,
              }
            : null,
        ),
        newValue: toAuditJson({
          monthKey: next,
          budget: nextBudget,
          carryForwardBalances,
          previousMonthKey: currentMonthKey,
        }),
      });
    } catch (e) {
      console.error("[audit] reset month", e);
    }
    notifyWhatsAppMonthReset(next, nextBudget, { carryForwardBalances });
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: { nextMonthKey: next } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not start new month" };
  }
}
