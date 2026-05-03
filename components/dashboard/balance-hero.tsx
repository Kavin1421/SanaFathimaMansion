"use client";

import { StatPills } from "@/components/dashboard/stat-pills";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import CountUp from "react-countup";

export function BalanceHero({ summary }: { summary: MonthlySummary }) {
  return (
    <section className="dashboard-surface col-span-12 p-8 md:p-10">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Total balance to settle</p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
            <CountUp
              end={summary.pendingBalanceMagnitude}
              duration={1.2}
              preserveValue
              decimals={0}
              formattingFn={(n) => formatInr(Math.round(n))}
            />
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Sum of suggested transfers to clear the ledger for this period. When everyone is even,
            this reads zero.
          </p>
        </div>
        <StatPills summary={summary} />
      </div>
    </section>
  );
}
