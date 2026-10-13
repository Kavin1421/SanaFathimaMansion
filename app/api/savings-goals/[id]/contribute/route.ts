import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { contributeSavingsGoalSchema } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { notifyHousehold } from "@/lib/telegram-notify";
import { formatInr } from "@/lib/utils";
import { contributeSavingsGoal } from "@/services/savings-goals";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = contributeSavingsGoalSchema.safeParse({ ...json, id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const data = await contributeSavingsGoal(parsed.data.id, parsed.data.amount);
    if (!data) {
      return NextResponse.json({ error: "Savings goal not found" }, { status: 404 });
    }
    notifyHousehold({
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
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
  }
}
