import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { connectDb } from "@/lib/db";
import { getHouseDisplayName } from "@/lib/house-name";
import { HouseSettings } from "@/models/HouseSettings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  displayName: z.string().min(1).max(120).trim(),
});

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const displayName = await getHouseDisplayName();
    return NextResponse.json({ displayName });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load house settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    await connectDb();
    await HouseSettings.findOneAndUpdate(
      { key: "default" },
      { key: "default", displayName: parsed.data.displayName },
      { upsert: true, new: true },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save house name" }, { status: 500 });
  }
}
