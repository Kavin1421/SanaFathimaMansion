"use client";

import { BalanceHero } from "@/components/dashboard/balance-hero";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardRecentTable } from "@/components/dashboard/dashboard-recent-table";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { NotificationsStack } from "@/components/dashboard/notifications-stack";
import { OwesList } from "@/components/dashboard/owes-list";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { UserBarChart } from "@/components/dashboard/user-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useQuery } from "@tanstack/react-query";

function buildSummaryText(s: MonthlySummary): string {
  const lines = [
    `${s.monthLabel} — ${s.monthKey}`,
    `Total spent: ${formatInr(s.totalSpent)}`,
    `Rent: ${formatInr(s.rentTotal)} · Groceries: ${formatInr(s.groceryTotal)}`,
    s.insight ?? "",
    "Settlements:",
    ...s.suggestions.map((x) => `${x.fromName} → ${x.toName}: ${formatInr(x.amount)}`),
  ].filter(Boolean);
  return lines.join("\n");
}

export function DashboardView({ monthKey }: { monthKey: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard(monthKey),
    queryFn: async (): Promise<MonthlySummary> => {
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(monthKey)}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <Card className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
        <p className="font-medium text-destructive">Could not load dashboard</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Check MongoDB connection and .env.local."}
        </p>
      </Card>
    );
  }

  const s = data;
  const summaryText = buildSummaryText(s);

  return (
    <div className="grid grid-cols-12 gap-10">
      <DashboardHeader summary={s} summaryText={summaryText} monthKey={monthKey} />

      <BalanceHero summary={s} />

      <NotificationsStack summary={s} />

      <section className="dashboard-surface col-span-12 p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Spend trend</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cumulative spend vs prior month at the same day-of-month pace.
          </p>
        </div>
        <SpendChart data={s.dailySpend} />
      </section>

      <section className="dashboard-surface col-span-12 p-6 md:col-span-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Category split</h3>
          <p className="mt-1 text-sm text-muted-foreground">Share of spending by category</p>
        </div>
        <CategoryDonut data={s.categoryBreakdown} />
      </section>

      <section className="dashboard-surface col-span-12 p-6 md:col-span-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Who paid</h3>
          <p className="mt-1 text-sm text-muted-foreground">Amount covered by each person</p>
        </div>
        <UserBarChart data={s.perUserContribution} />
      </section>

      <OwesList summary={s} monthKey={monthKey} />

      <section className="dashboard-surface col-span-12 p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Net balance by person</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Positive means the group owes them; negative means they owe the group.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.balances.map((b) => (
            <div
              key={b.userId}
              className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-800/30"
            >
              <span className="text-sm font-medium">{b.name}</span>
              <Badge variant={b.balance > 0 ? "success" : b.balance < 0 ? "danger" : "secondary"}>
                {b.balance > 0 ? "+" : ""}
                {formatInr(b.balance)}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-surface col-span-12 p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Recent transactions</h3>
          <p className="mt-1 text-sm text-muted-foreground">This month · newest first</p>
        </div>
        <DashboardRecentTable rows={s.recentExpensesDetailed} />
      </section>
    </div>
  );
}
