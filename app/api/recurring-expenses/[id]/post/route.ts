import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { isAdminSession } from "@/lib/admin";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { monthKeyFromDate } from "@/lib/dates";
import { appendAuditLog } from "@/services/audit-log";
import { postRecurring } from "@/services/recurring-expenses";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const monthKey =
      typeof json.monthKey === "string" && /^\d{4}-\d{2}$/.test(json.monthKey)
        ? json.monthKey
        : monthKeyFromDate(new Date());

    const result = await postRecurring(id, monthKey);
    if (!result) {
      return NextResponse.json({ error: "Recurring expense not found" }, { status: 404 });
    }
    try {
      await appendAuditLog({
        actionType: "RECURRING_EXPENSE_POSTED",
        performedBy: performerFromSession(session),
        targetEntity: {
          type: "recurring_expense",
          id: result.recurring._id,
          label: result.recurring.title,
        },
        newValue: toAuditJson({ monthKey, expenseId: result.expenseId }),
      });
    } catch (e) {
      console.error("[audit] recurring posted", e);
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Failed to post recurring expense";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
