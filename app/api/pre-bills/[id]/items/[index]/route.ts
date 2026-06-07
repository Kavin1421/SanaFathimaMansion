import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { isHouseAdminSession } from "@/lib/admin";
import { setPreBillItemPurchased } from "@/services/pre-bills";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: { id: string; index: string } },
) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ledgerId = session.user?.ledgerUserId ?? null;
  const isHouseAdmin = isHouseAdminSession(session);
  if (!isHouseAdmin && !ledgerId) {
    return NextResponse.json(
      { error: "Link your account to a household member first" },
      { status: 403 },
    );
  }

  const itemIndex = parseInt(context.params.index, 10);
  if (!Number.isFinite(itemIndex) || itemIndex < 0) {
    return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
  }

  let body: { isPurchased?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const isPurchased = Boolean(body.isPurchased);

  try {
    const data = await setPreBillItemPurchased(
      context.params.id,
      itemIndex,
      isPurchased,
      ledgerId,
      isHouseAdmin,
    );
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update item" },
      { status: 400 },
    );
  }
}
