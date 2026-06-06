import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { monthKeyFromDate } from "@/lib/dates";
import { listExpenses } from "@/services/expenses";
import { listUsers } from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: string | number | undefined | null): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? monthKeyFromDate(new Date());
    const [expenses, users] = await Promise.all([
      listExpenses({ monthKey: month }),
      listUsers(),
    ]);
    const userMap = new Map(users.map((u) => [u._id, u.name]));

    const header = [
      "Date",
      "Title",
      "Category",
      "Paid By",
      "Amount (INR)",
      "Split Mode",
      "Split Between",
      "Split Amounts",
      "Notes",
    ].join(",");

    const rows = expenses.map((e) => {
      const splitNames = e.splitBetween.map((id) => userMap.get(id) ?? id).join("; ");
      const splitAmountsDetail =
        e.splitEnabled !== false && e.splitMode === "custom" && e.splitAmounts?.length
          ? e.splitAmounts
              .map((row) => `${userMap.get(row.userId) ?? row.userId}: ${row.amount}`)
              .join("; ")
          : e.splitEnabled === false
            ? "—"
            : "";
      const notes = e.description?.trim() || e.notes?.trim() || "";
      return [
        csvEscape(new Date(e.date).toISOString().slice(0, 10)),
        csvEscape(e.title),
        csvEscape(e.category),
        csvEscape(userMap.get(e.paidBy) ?? e.paidBy),
        csvEscape(e.amount),
        csvEscape(e.splitEnabled === false ? "house" : e.splitMode ?? "equal"),
        csvEscape(e.splitEnabled === false ? "—" : splitNames),
        csvEscape(splitAmountsDetail),
        csvEscape(notes),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = `expenses-${month}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
  }
}
