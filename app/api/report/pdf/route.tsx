import { MonthlyReportPdfDocument } from "@/components/pdf/monthly-report-pdf";
import { DEFAULT_HOUSE_NAME } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/dates";
import { getMonthlySummary } from "@/services/aggregations";
import { pdf } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? monthKeyFromDate(new Date());
    const summary = await getMonthlySummary(month);
    const doc = (
      <MonthlyReportPdfDocument summary={summary} houseName={DEFAULT_HOUSE_NAME} />
    );
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
