import { MonthlyReportPdfDocument } from "@/components/pdf/monthly-report-pdf";
import { requireAuthSession } from "@/lib/api-auth";
import { monthKeyFromDate } from "@/lib/dates";
import { getHouseDisplayName } from "@/lib/house-name";
import { getMonthlySummary } from "@/services/aggregations";
import { pdf } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? monthKeyFromDate(new Date());
    const summary = await getMonthlySummary(month);
    const houseName = await getHouseDisplayName();
    const doc = <MonthlyReportPdfDocument summary={summary} houseName={houseName} />;
    const blob = await pdf(doc).toBlob();
    const buf = Buffer.from(await blob.arrayBuffer());
    const filename = `expenses-${month}.pdf`;
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
