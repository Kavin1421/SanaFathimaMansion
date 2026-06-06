import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { monthKeyFromDate } from "@/lib/dates";
import { getRecentActivity } from "@/services/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const items = await getRecentActivity(limit);
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
