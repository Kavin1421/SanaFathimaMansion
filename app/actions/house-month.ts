"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import { nextMonthKey } from "@/lib/dates";
import { notifyTelegramMonthReset, notifyTelegramWalletBudgetAmended, notifyTelegramWalletBudgetUpdated } from "@/lib/telegram-notify";
import { appendAuditLog } from "@/services/audit-log";
import { getHouseMonthByKey, upsertHouseMonthBudget } from "@/services/house-month";
import {
  acknowledgeOverspend,
  getHouseSettings,
  updateBudgetThresholds,
} from "@/services/house-settings-ext";
import type { UpdateBudgetThresholdsInput } from "@/lib/validation";
import { acknowledgeOverspendSchema, updateBudgetThresholdsSchema } from "@/lib/validation";
import type { ActionResult } from "./users";

export async function setMonthBudgetAction(
  monthKey: string,
  budget: number,
): Promise<ActionResult<{ monthKey: string; budget: number }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "month", id: monthKey, label: "setMonthBudgetAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "setMonthBudgetAction" },
      });
    } catch {}
    return { ok: false, error: "Only an admin can set the budget" };
  }
  if (!monthKey.match(/^\d{4}-\d{2}$/) || budget < 0 || !Number.isFinite(budget)) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "setMonthBudgetAction" },
        newValue: toAuditJson({ monthKey, budget }),
      });
    } catch {}
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
    notifyTelegramWalletBudgetUpdated(monthKey, budget);
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: { monthKey, budget } };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "setMonthBudgetAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not save budget" };
  }
}

export async function amendMonthBudgetAction(
  monthKey: string,
  additionalAmount: number,
): Promise<ActionResult<{ monthKey: string; previousBudget: number; additionalAmount: number; budget: number }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "month", id: monthKey, label: "amendMonthBudgetAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "amendMonthBudgetAction" },
      });
    } catch {}
    return { ok: false, error: "Only an admin can amend the wallet" };
  }
  if (!monthKey.match(/^\d{4}-\d{2}$/) || additionalAmount <= 0 || !Number.isFinite(additionalAmount)) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "amendMonthBudgetAction" },
        newValue: toAuditJson({ monthKey, additionalAmount }),
      });
    } catch {}
    return { ok: false, error: "Enter a valid amount greater than zero" };
  }
  try {
    const prevDoc = await getHouseMonthByKey(monthKey);
    const previousBudget = prevDoc?.budget ?? 0;
    const budget = previousBudget + additionalAmount;
    await upsertHouseMonthBudget({ monthKey, budget });
    try {
      await appendAuditLog({
        actionType: "UPDATE_BUDGET",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: monthKey },
        previousValue: toAuditJson(
          prevDoc
            ? { monthKey: prevDoc.monthKey, budget: prevDoc.budget, carryForwardBalances: prevDoc.carryForwardBalances }
            : { monthKey, budget: 0 },
        ),
        newValue: toAuditJson({ monthKey, budget, amend: true, previousBudget, additionalAmount }),
      });
    } catch (e) {
      console.error("[audit] amend budget", e);
    }
    notifyTelegramWalletBudgetAmended(monthKey, { previousBudget, additionalAmount, budget });
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: { monthKey, previousBudget, additionalAmount, budget } };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: monthKey, label: "amendMonthBudgetAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not amend wallet" };
  }
}

export async function startNewMonthAction(
  currentMonthKey: string,
  nextBudget: number,
  carryForwardBalances: boolean,
): Promise<ActionResult<{ nextMonthKey: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "month", id: currentMonthKey, label: "startNewMonthAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: currentMonthKey, label: "startNewMonthAction" },
      });
    } catch {}
    return { ok: false, error: "Only an admin can start a new month" };
  }
  const next = nextMonthKey(currentMonthKey);
  if (nextBudget < 0 || !Number.isFinite(nextBudget)) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: next, label: "startNewMonthAction" },
        newValue: toAuditJson({ currentMonthKey, nextBudget, carryForwardBalances }),
      });
    } catch {}
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
    notifyTelegramMonthReset(next, nextBudget, { carryForwardBalances });
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: { nextMonthKey: next } };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: next, label: "startNewMonthAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not start new month" };
  }
}

export async function updateBudgetThresholdsAction(
  input: UpdateBudgetThresholdsInput,
): Promise<ActionResult<Awaited<ReturnType<typeof updateBudgetThresholds>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  if (!isAdminSession(session)) return { ok: false, error: "Only an admin can update budget thresholds" };
  const parsed = updateBudgetThresholdsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const before = await getHouseSettings();
    const data = await updateBudgetThresholds(parsed.data);
    try {
      await appendAuditLog({
        actionType: "UPDATE_HOUSE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "house", id: "default", label: "Budget thresholds" },
        previousValue: toAuditJson({
          budgetThresholdWarn: before.budgetThresholdWarn,
          budgetThresholdOver: before.budgetThresholdOver,
        }),
        newValue: toAuditJson({
          budgetThresholdWarn: data.budgetThresholdWarn,
          budgetThresholdOver: data.budgetThresholdOver,
        }),
      });
    } catch (e) {
      console.error("[audit] update thresholds", e);
    }
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update thresholds" };
  }
}

export async function acknowledgeOverspendAction(
  monthKey: string,
): Promise<ActionResult<Awaited<ReturnType<typeof acknowledgeOverspend>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  const parsed = acknowledgeOverspendSchema.safeParse({ monthKey });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await acknowledgeOverspend(parsed.data.monthKey);
    try {
      await appendAuditLog({
        actionType: "ACKNOWLEDGE_OVERSPEND",
        performedBy: performerFromSession(session),
        targetEntity: { type: "month", id: parsed.data.monthKey, label: parsed.data.monthKey },
        newValue: toAuditJson({ monthKey: parsed.data.monthKey }),
      });
    } catch (e) {
      console.error("[audit] acknowledge overspend", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not acknowledge overspend" };
  }
}
