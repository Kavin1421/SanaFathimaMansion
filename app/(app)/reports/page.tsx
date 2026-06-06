import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { monthKeyFromDate, parseMonthKey } from "@/lib/dates";
import { FileDown } from "lucide-react";
import { format } from "date-fns";

type Props = { searchParams: { month?: string } };

export default function ReportsPage({ searchParams }: Props) {
  const monthKey =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : monthKeyFromDate(new Date());
  const label = format(parseMonthKey(monthKey), "MMMM yyyy");
  const pdfHref = `/api/report/pdf?month=${encodeURIComponent(monthKey)}`;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8">
          <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Export a printable summary for <span className="font-medium text-foreground">{label}</span>.
          </p>
        </div>
      </div>

      <Card className="card-hover col-span-12 rounded-2xl border shadow-sm glow-card">
        <CardHeader>
          <CardTitle>Monthly exports</CardTitle>
          <CardDescription>
            PDF for printing; CSV for Excel or Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button className="rounded-xl active:scale-[0.98]" asChild>
            <a href={pdfHref} target="_blank" rel="noreferrer">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl active:scale-[0.98]" asChild>
            <a href={`/api/report/csv?month=${encodeURIComponent(monthKey)}`} download>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
