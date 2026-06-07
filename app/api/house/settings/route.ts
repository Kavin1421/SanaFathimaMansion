import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { isAdminSession } from "@/lib/admin";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import {
  acknowledgeOverspendSchema,
  updateBudgetThresholdsSchema,
} from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import {
  acknowledgeOverspend,
  getHouseSettings,
  updateBudgetThresholds,
} from "@/services/house-settings-ext";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getHouseSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load house settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const json = await req.json();
    const parsed = updateBudgetThresholdsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
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
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update house settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await req.json();
    const parsed = acknowledgeOverspendSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
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
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to acknowledge overspend" }, { status: 500 });
  }
}
