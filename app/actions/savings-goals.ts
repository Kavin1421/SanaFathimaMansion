"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import {
  contributeSavingsGoalSchema,
  createSavingsGoalSchema,
  type ContributeSavingsGoalInput,
  type CreateSavingsGoalInput,
} from "@/lib/validation";
import { notifyHousehold } from "@/lib/telegram-notify";
import { formatInr } from "@/lib/utils";
import { appendAuditLog } from "@/services/audit-log";
import {
  contributeSavingsGoal,
  createSavingsGoal,
  deleteSavingsGoal,
  getSavingsGoalById,
  updateSavingsGoal,
} from "@/services/savings-goals";
import type { ActionResult } from "./users";

async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

export async function createSavingsGoalAction(
  input: CreateSavingsGoalInput,
): Promise<ActionResult<Awaited<ReturnType<typeof createSavingsGoal>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const parsed = createSavingsGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createSavingsGoal({
      ...parsed.data,
      createdBy: session.user.id,
    });
    await notifyHousehold({
      heading: "Savings goal added",
      title: data.title,
      lines: [`${formatInr(data.currentAmount)} of ${formatInr(data.targetAmount)}`],
      path: "/dashboard",
      icon: "🎯",
      eventType: "telegram_savings_created",
      dedupeKey: `savings:${data._id}:created`,
      metadata: { savingsGoalId: data._id },
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create savings goal" };
  }
}

export async function contributeSavingsGoalAction(
  input: ContributeSavingsGoalInput,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof contributeSavingsGoal>>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const parsed = contributeSavingsGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await contributeSavingsGoal(parsed.data.id, parsed.data.amount);
    if (!data) return { ok: false, error: "Savings goal not found" };
    await notifyHousehold({
      heading: "Savings contribution",
      title: data.title,
      lines: [
        `${session.user.name ?? "Someone"} added ${formatInr(parsed.data.amount)}`,
        `${formatInr(data.currentAmount)} of ${formatInr(data.targetAmount)}`,
      ],
      path: "/dashboard",
      icon: "🎯",
      eventType: "telegram_savings_contribution",
      metadata: { savingsGoalId: data._id, amount: parsed.data.amount },
    });
    try {
      await appendAuditLog({
        actionType: "SAVINGS_GOAL_CONTRIBUTION",
        performedBy: performerFromSession(session),
        targetEntity: { type: "savings_goal", id: data._id, label: data.title },
        newValue: toAuditJson({ amount: parsed.data.amount, currentAmount: data.currentAmount }),
      });
    } catch (e) {
      console.error("[audit] savings contribution", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not contribute" };
  }
}

export async function updateSavingsGoalAction(input: {
  id: string;
  title?: string;
  targetAmount?: number;
  active?: boolean;
}): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateSavingsGoal>>>>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  try {
    const data = await updateSavingsGoal(input);
    if (!data) return { ok: false, error: "Savings goal not found" };
    await notifyHousehold({
      heading: "Savings goal updated",
      title: data.title,
      lines: [
        `${formatInr(data.currentAmount)} of ${formatInr(data.targetAmount)}`,
        data.active ? "Active" : "Paused",
      ],
      path: "/dashboard",
      icon: "🎯",
      eventType: "telegram_savings_updated",
      metadata: { savingsGoalId: data._id },
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update savings goal" };
  }
}

export async function deleteSavingsGoalAction(id: string): Promise<ActionResult<null>> {
  const session = await requireUserSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  try {
    const before = await getSavingsGoalById(id);
    const ok = await deleteSavingsGoal(id);
    if (!ok) return { ok: false, error: "Savings goal not found" };
    if (before) {
      await notifyHousehold({
        heading: "Savings goal removed",
        title: before.title,
        lines: [`Removed by ${session.user.name ?? "Someone"}`],
        path: "/dashboard",
        icon: "🎯",
        eventType: "telegram_savings_deleted",
        dedupeKey: `savings:${before._id}:deleted`,
        metadata: { savingsGoalId: before._id },
      });
    }
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete savings goal" };
  }
}
