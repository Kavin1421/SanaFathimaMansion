import { NextResponse } from "next/server";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { requireAuthSession } from "@/lib/api-auth";
import { appendAuditLog } from "@/services/audit-log";
import { setOnboardingCompleted } from "@/services/account";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "onboarding", label: "POST /api/onboarding/complete" },
      });
    } catch {}
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await setOnboardingCompleted(session.user.id, true);
    try {
      await appendAuditLog({
        actionType: "COMPLETE_ONBOARDING",
        performedBy: performerFromSession(session),
        targetEntity: { type: "onboarding", id: session.user.id, label: session.user.name ?? session.user.email ?? "user" },
        newValue: toAuditJson({ onboardingCompleted: true }),
      });
    } catch (e) {
      console.error("[audit] onboarding complete", e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "onboarding", id: session.user.id, label: "POST /api/onboarding/complete" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
