import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { contributeSavingsGoalSchema } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
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
