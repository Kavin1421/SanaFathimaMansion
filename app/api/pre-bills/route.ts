import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { listPreBills } from "@/services/pre-bills";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filters: { status: "draft" | "finalized" } | undefined =
      status === "draft"
        ? { status: "draft" }
        : status === "finalized"
          ? { status: "finalized" }
          : undefined;
    const rows = await listPreBills(filters);
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load pre-bills" }, { status: 500 });
  }
}
