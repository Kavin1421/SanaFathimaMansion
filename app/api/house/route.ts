import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { connectDb } from "@/lib/db";
import { getHouseDisplayName } from "@/lib/house-name";
import { appendAuditLog } from "@/services/audit-log";
import { HouseSettings } from "@/models/HouseSettings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  displayName: z.string().min(1).max(120).trim(),
});

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const displayName = await getHouseDisplayName();
    return NextResponse.json({ displayName });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load house settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "house", label: "POST /api/house" },
      });
    } catch {}
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      try {
        await appendAuditLog({
          actionType: "VALIDATION_FAILED",
          performedBy: performerFromSession(session),
          targetEntity: { type: "house", label: "POST /api/house" },
          newValue: toAuditJson({ issues: parsed.error.issues }),
        });
      } catch {}
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    await connectDb();
    const before = await HouseSettings.findOne({ key: "default" }).lean();
    await HouseSettings.findOneAndUpdate(
      { key: "default" },
      { key: "default", displayName: parsed.data.displayName },
      { upsert: true, new: true },
    );
    try {
      await appendAuditLog({
        actionType: "UPDATE_HOUSE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "house", id: "default", label: "House settings" },
        previousValue: toAuditJson(before ? { displayName: before.displayName } : null),
        newValue: toAuditJson({ displayName: parsed.data.displayName }),
      });
    } catch (e) {
      console.error("[audit] update house", e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save house name" }, { status: 500 });
  }
}
