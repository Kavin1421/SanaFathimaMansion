import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { getPreBillById } from "@/services/pre-bills";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = context.params;
    const row = await getPreBillById(id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load pre-bill" }, { status: 500 });
  }
}
