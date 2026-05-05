import { NextResponse } from "next/server";
import { runMonthlySummaryBroadcast } from "@/services/engagement";

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const got = req.headers.get("x-cron-secret")?.trim();
  return got === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runMonthlySummaryBroadcast();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/monthly-summary]", e);
    return NextResponse.json({ error: "Failed to run monthly summary" }, { status: 500 });
  }
}
