import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isSuperAdminSession } from "@/lib/super-admin";
import { AUDIT_ACTION_TYPES, type AuditActionType } from "@/lib/audit-constants";
import { listAuditLogs } from "@/services/audit-log";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("userId") ?? undefined;
  const actionType = searchParams.get("actionType") as AuditActionType | null;
  if (actionType && !AUDIT_ACTION_TYPES.includes(actionType)) {
    return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  }
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid from" }, { status: 400 });
  }
  if (to && Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid to" }, { status: 400 });
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25") || 25));
  const skip = (page - 1) * limit;

  try {
    const { rows, total } = await listAuditLogs({
      accountId,
      actionType: actionType ?? undefined,
      from,
      to,
      limit,
      skip,
    });
    return NextResponse.json({ rows, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
