import { NextResponse } from "next/server";
import { monthKeyFromDate } from "@/lib/dates";
import { requireAuthSession } from "@/lib/api-auth";
import { getMonthlySummary } from "@/services/aggregations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? monthKeyFromDate(new Date());
    const summary = await getMonthlySummary(month);
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
