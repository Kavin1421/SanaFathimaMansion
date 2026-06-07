"use client";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AdminMonthPanel } from "@/components/dashboard/admin-month-panel";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardRecentTable } from "@/components/dashboard/dashboard-recent-table";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ExpenseApprovalQueue } from "@/components/dashboard/expense-approval-queue";
import { MonthlyStoryCard } from "@/components/dashboard/monthly-story-card";
import { NotificationsStack } from "@/components/dashboard/notifications-stack";
import { PersonalBalanceHint } from "@/components/dashboard/personal-balance-hint";
import { OwesList } from "@/components/dashboard/owes-list";
import { RecurringExpensesBanner } from "@/components/dashboard/recurring-expenses-panel";
import { SavingsGoalsCard } from "@/components/dashboard/savings-goals-card";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { UserBarChart } from "@/components/dashboard/user-bar-chart";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { YourBalanceCard } from "@/components/dashboard/your-balance-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useRefetchIntervalMs } from "@/hooks/use-refetch-interval";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

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

function parseAmendWallet(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function DashboardView({
  monthKey,
  amendWallet,
}: {
  monthKey: string;
  amendWallet?: string | null;
}) {
  const refetchInterval = useRefetchIntervalMs(20_000);
  const [amendPrefill, setAmendPrefill] = useState<number | null>(() => parseAmendWallet(amendWallet));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard(monthKey),
    queryFn: async (): Promise<MonthlySummary> => {
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(monthKey)}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    refetchInterval,
  });

  const currentBalances = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(data.balances.map((b) => [b.userId, b.balance]));
  }, [data]);

  const handleAddFunds = useCallback(() => {
    if (data?.monthRemaining != null && data.monthRemaining < 0) {
      setAmendPrefill(Math.ceil(Math.abs(data.monthRemaining)));
      return;
    }
    document.getElementById("admin-month-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data?.monthRemaining]);

  const handleAmendConsumed = useCallback(() => {
    setAmendPrefill(null);
  }, []);

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
    <div className="grid grid-cols-12 gap-5 sm:gap-7 md:gap-9">
      <DashboardHeader summary={s} summaryText={summaryText} monthKey={monthKey} />

      <div className="col-span-12">
        <PersonalBalanceHint summary={s} />
      </div>

      <YourBalanceCard summary={s} />

      <WalletCard summary={s} monthKey={monthKey} onAddFunds={handleAddFunds} />

      <div id="admin-month-panel" className="col-span-12">
        <AdminMonthPanel
          monthKey={monthKey}
          summary={s}
          initialAmendAmount={amendPrefill}
          onInitialAmendConsumed={handleAmendConsumed}
        />
      </div>

      <RecurringExpensesBanner monthKey={monthKey} summary={s} currentBalances={currentBalances} />

      <ExpenseApprovalQueue monthKey={monthKey} summary={s} currentBalances={currentBalances} />

      <MonthlyStoryCard monthKey={monthKey} />

      <SavingsGoalsCard />

      <BalanceHero summary={s} />

      <NotificationsStack summary={s} />

      <ActivityFeed />

      <section className="dashboard-surface col-span-12 p-5 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Spend trend</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cumulative spend vs prior month at the same day-of-month pace.
          </p>
        </div>
        <SpendChart data={s.dailySpend} />
      </section>

      <section className="dashboard-surface col-span-12 p-5 md:col-span-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Category split</h3>
          <p className="mt-1 text-sm text-muted-foreground">Share of spending by category</p>
        </div>
        <CategoryDonut data={s.categoryBreakdown} />
      </section>

      <section className="dashboard-surface col-span-12 p-5 md:col-span-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Who paid</h3>
          <p className="mt-1 text-sm text-muted-foreground">Amount covered by each person</p>
        </div>
        <UserBarChart data={s.perUserContribution} />
      </section>

      <OwesList summary={s} monthKey={monthKey} />

      <section className="dashboard-surface col-span-12 p-5 md:p-8">
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

      <section className="dashboard-surface col-span-12 p-5 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Recent transactions</h3>
          <p className="mt-1 text-sm text-muted-foreground">This month · newest first</p>
        </div>
        <DashboardRecentTable rows={s.recentExpensesDetailed} />
      </section>
    </div>
  );
}
