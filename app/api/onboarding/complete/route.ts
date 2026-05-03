import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { setOnboardingCompleted } from "@/services/account";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await setOnboardingCompleted(session.user.id, true);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
