import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { isAdminSession } from "@/lib/admin";
import { listPendingExpenses } from "@/services/expenses";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const rows = await listPendingExpenses();
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load pending expenses" }, { status: 500 });
  }
}
