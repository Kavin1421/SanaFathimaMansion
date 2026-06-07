import { NextResponse } from "next/server";
import { monthKeyFromDate } from "@/lib/dates";
import { requireAuthSession } from "@/lib/api-auth";
import { getMonthlyStory } from "@/services/monthly-story";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? monthKeyFromDate(new Date());
    const story = await getMonthlyStory(month);
    return NextResponse.json(story);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load monthly story" }, { status: 500 });
  }
}
