import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isSuperAdminSession } from "@/lib/super-admin";
import { listNotificationEvents } from "@/services/notification-events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const channelRaw = searchParams.get("channel");
  const statusRaw = searchParams.get("status");
  const eventType = searchParams.get("eventType") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const channel =
    channelRaw === "email" || channelRaw === "whatsapp" ? channelRaw : undefined;
  const status =
    statusRaw === "sent" || statusRaw === "failed" || statusRaw === "skipped" ? statusRaw : undefined;

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25") || 25));
  const skip = (page - 1) * limit;

  try {
    const { rows, total } = await listNotificationEvents({
      channel,
      status,
      eventType,
      search,
      limit,
      skip,
    });
    return NextResponse.json({ rows, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load notification events" }, { status: 500 });
  }
}
