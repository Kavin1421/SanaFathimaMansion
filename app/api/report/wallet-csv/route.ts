import { NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";
import { listWalletAmendments } from "@/services/wallet-history";

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
    const monthKey = searchParams.get("month") ?? undefined;
    const rows = await listWalletAmendments(monthKey);

    const header = [
      "Date",
      "Month",
      "Previous Budget",
      "Added Amount",
      "New Budget",
      "Performed By",
    ].join(",");

    const csvRows = rows.map((r) =>
      [
        csvEscape(r.createdAt.slice(0, 10)),
        csvEscape(r.monthKey),
        csvEscape(r.previousBudget),
        csvEscape(r.additionalAmount),
        csvEscape(r.newBudget),
        csvEscape(r.performedByName),
      ].join(","),
    );

    const csv = [header, ...csvRows].join("\n");
    const filename = monthKey ? `wallet-funding-${monthKey}.csv` : "wallet-funding-history.csv";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate wallet CSV" }, { status: 500 });
  }
}
