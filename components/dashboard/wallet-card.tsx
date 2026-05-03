"use client";

import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { AlertTriangle, Wallet } from "lucide-react";

export function WalletCard({ summary }: { summary: MonthlySummary }) {
  const { monthBudget, monthRemaining, monthWalletProgress, budgetAlertLevel } = summary;
  const hasBudget = monthBudget != null && monthBudget > 0;

  return (
    <section className="dashboard-surface col-span-12 p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Monthly wallet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              House budget vs spend for {summary.monthLabel}
            </p>
          </div>
        </div>
      </div>

      {!hasBudget ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No budget set for this month. An admin can set the monthly cap to track remaining balance.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Budget
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(monthBudget!)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Spent
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(summary.totalSpent)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  (monthRemaining ?? 0) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatInr(monthRemaining ?? 0)}
              </p>
            </div>
          </div>
          {monthWalletProgress != null ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used</span>
                <span>{Math.round(monthWalletProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(100, monthWalletProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          {budgetAlertLevel === "warn" ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>About 80% of the monthly budget is used — plan the rest of the month carefully.</span>
            </div>
          ) : null}
          {budgetAlertLevel === "over" ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Spend has exceeded the monthly budget.</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
