"use client";

import { ShareActions } from "@/components/share-actions";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { Crown } from "lucide-react";

type Props = {
  summary: MonthlySummary;
  summaryText: string;
  monthKey: string;
};

export function DashboardHeader({ summary, summaryText, monthKey }: Props) {
  return (
    <header className="col-span-12 space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Overview
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{summary.monthLabel}</h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Balances carry through month end, including completed settlements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareActions summaryText={summaryText} />
          <Button variant="secondary" className="rounded-xl" asChild>
            <a
              href={`/api/report/pdf?month=${encodeURIComponent(monthKey)}`}
              target="_blank"
              rel="noreferrer"
            >
              Export PDF
            </a>
          </Button>
        </div>
      </div>

      {(summary.topSpenderLabel || summary.monthlyWinner) && (
        <div className="dashboard-surface flex items-center gap-3 rounded-2xl px-5 py-4">
          <Crown className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm text-muted-foreground">Top spender</p>
            <p className="text-sm font-medium">
              {summary.topSpenderLabel ??
                (summary.monthlyWinner
                  ? `${summary.monthlyWinner.name} · paid ${formatInr(summary.monthlyWinner.totalPaid)}`
                  : "")}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
