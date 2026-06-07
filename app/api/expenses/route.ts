import { NextResponse } from "next/server";
import type { ExpenseCategory } from "@/lib/constants";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { requireAuthSession } from "@/lib/api-auth";
import { listExpenses } from "@/services/expenses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get("month") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const paidBy = searchParams.get("paidBy") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const includePending = searchParams.get("includePending") === "true";

    const cat =
      category && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
        ? (category as ExpenseCategory)
        : undefined;

    const expenses = await listExpenses({
      monthKey,
      category: cat,
      paidBy: paidBy ?? undefined,
      search: search ?? undefined,
      includePending,
    });
    return NextResponse.json(expenses);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}
