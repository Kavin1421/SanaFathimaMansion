import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { listSettlements } from "@/services/settlements";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rows = await listSettlements();
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load settlements" }, { status: 500 });
  }
}
