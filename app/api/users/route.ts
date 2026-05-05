import { NextResponse } from "next/server";
import { appendAuditLog } from "@/services/audit-log";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { requireAuthSession } from "@/lib/api-auth";
import { isAdminSession } from "@/lib/admin";
import { createUserSchema } from "@/lib/validation";
import { createUser, listUsers } from "@/services/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "user", label: "POST /api/users" },
      });
    } catch {}
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", label: "POST /api/users" },
      });
    } catch {}
    return NextResponse.json({ error: "Only super admin can invite users" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      try {
        await appendAuditLog({
          actionType: "VALIDATION_FAILED",
          performedBy: performerFromSession(session),
          targetEntity: { type: "user", label: "POST /api/users" },
          newValue: toAuditJson({ issues: parsed.error.issues }),
        });
      } catch {}
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const user = await createUser(parsed.data);
    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 500 },
    );
  }
}
