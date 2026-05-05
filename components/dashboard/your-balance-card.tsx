"use client";

import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useSession } from "next-auth/react";

export function YourBalanceCard({ summary }: { summary: MonthlySummary }) {
  const { data: session } = useSession();
  const ledgerId = session?.user?.ledgerUserId;
  if (!ledgerId) return null;
  const row = summary.personalBalances.find((x) => x.userId === ledgerId);
  if (!row) return null;

  return (
    <Card className="col-span-12 rounded-2xl border p-5 shadow-sm md:col-span-6 lg:col-span-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Balance</p>
      <div className="mt-3 space-y-2">
        <p className="text-sm text-muted-foreground">Total paid: {formatInr(row.totalPaid)}</p>
        <p className="text-sm text-muted-foreground">Total owed: {formatInr(row.totalOwed)}</p>
        <p className="text-lg font-semibold">
          {row.netBalance >= 0 ? "You are owed" : "You owe"} {formatInr(Math.abs(row.netBalance))}
        </p>
      </div>
    </Card>
  );
}
