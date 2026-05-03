"use client";

import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import CountUp from "react-countup";

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 px-5 py-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-800/40">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        <CountUp
          end={value}
          duration={1.1}
          preserveValue
          decimals={0}
          formattingFn={(n) => formatInr(Math.round(n))}
        />
      </p>
    </div>
  );
}

export function StatPills({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-col lg:items-stretch">
      <Pill label="Rent" value={summary.rentTotal} />
      <Pill label="Groceries" value={summary.groceryTotal} />
      <Pill label="Total expenses" value={summary.totalSpent} />
    </div>
  );
}
