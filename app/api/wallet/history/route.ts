import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { listWalletAmendments } from "@/services/wallet-history";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get("month") ?? undefined;
    const rows = await listWalletAmendments(monthKey);
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load wallet history" }, { status: 500 });
  }
}
