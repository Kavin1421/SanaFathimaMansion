"use client";

import { acknowledgeOverspendAction } from "@/app/actions/house-month";
import { WalletFundingHistory } from "@/components/dashboard/wallet-funding-history";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { isHouseAdminUser } from "@/lib/roles";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Plus, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { toast } from "sonner";

export function WalletCard({
  summary,
  monthKey,
  onAddFunds,
}: {
  summary: MonthlySummary;
  monthKey: string;
  onAddFunds?: () => void;
}) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isHouseAdmin = isHouseAdminUser(session?.user);
  const { monthBudget, monthRemaining, monthWalletProgress, budgetAlertLevel, overspendAcknowledged } =
    summary;
  const hasBudget = monthBudget != null && monthBudget > 0;
  const [ackBusy, setAckBusy] = useState(false);
  const prevRemaining = useRef(monthRemaining ?? 0);
  const [countUpStart, setCountUpStart] = useState(monthRemaining ?? 0);
  const [countUpKey, setCountUpKey] = useState(0);

  useEffect(() => {
    if (monthRemaining != null && monthRemaining !== prevRemaining.current) {
      setCountUpStart(prevRemaining.current);
      prevRemaining.current = monthRemaining;
      setCountUpKey((k) => k + 1);
    }
  }, [monthRemaining]);

  async function acknowledgeOverspend() {
    setAckBusy(true);
    try {
      const r = await acknowledgeOverspendAction(monthKey);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Overspend acknowledged");
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
    } finally {
      setAckBusy(false);
    }
  }

  return (
    <section className="dashboard-surface col-span-12 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        {isHouseAdmin && hasBudget ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl" onClick={onAddFunds}>
              <Plus className="mr-2 h-4 w-4" />
              Add funds
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <a href={`/api/report/wallet-csv?month=${encodeURIComponent(monthKey)}`} download>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {!hasBudget ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No budget set for this month. An admin can set the monthly cap to track remaining balance.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(monthBudget!)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Spent</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(summary.totalSpent)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining</p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  (monthRemaining ?? 0) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <CountUp
                  key={countUpKey}
                  start={countUpStart}
                  end={monthRemaining ?? 0}
                  duration={1.2}
                  separator=","
                  formattingFn={(n) => formatInr(n)}
                />
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
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>About 80% of the monthly budget is used — plan the rest of the month carefully.</span>
              </div>
              {isHouseAdmin && onAddFunds ? (
                <Button type="button" size="sm" variant="outline" className="rounded-xl shrink-0" onClick={onAddFunds}>
                  Add funds
                </Button>
              ) : null}
            </div>
          ) : null}
          {budgetAlertLevel === "over" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Spend has exceeded the monthly budget.
                  {overspendAcknowledged ? " (Acknowledged)" : ""}
                </span>
              </div>
              {isHouseAdmin ? (
                <div className="flex flex-wrap gap-2">
                  {onAddFunds ? (
                    <Button type="button" size="sm" className="rounded-xl" onClick={onAddFunds}>
                      Add funds
                    </Button>
                  ) : null}
                  {!overspendAcknowledged ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={ackBusy}
                      onClick={() => void acknowledgeOverspend()}
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <WalletFundingHistory monthKey={monthKey} />
        </div>
      )}
    </section>
  );
}
