import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { isAdminSession } from "@/lib/admin";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { createRecurringExpenseSchema } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { createRecurringExpense, listRecurringExpenses } from "@/services/recurring-expenses";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rows = await listRecurringExpenses();
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load recurring expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const json = await req.json();
    const parsed = createRecurringExpenseSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const data = await createRecurringExpense({
      ...parsed.data,
      createdBy: session.user.id,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create recurring expense" }, { status: 500 });
  }
}
