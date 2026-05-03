import { NextResponse } from "next/server";
import { monthKeyFromDate } from "@/lib/dates";
import { getMonthlySummary } from "@/services/aggregations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
