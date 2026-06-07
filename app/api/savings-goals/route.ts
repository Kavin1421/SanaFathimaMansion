import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { createSavingsGoalSchema } from "@/lib/validation";
import { listSavingsGoals, createSavingsGoal } from "@/services/savings-goals";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const goals = await listSavingsGoals();
    return NextResponse.json(goals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load savings goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await req.json();
    const parsed = createSavingsGoalSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const goal = await createSavingsGoal({
      ...parsed.data,
      createdBy: session.user.id,
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create savings goal" }, { status: 500 });
  }
}
