"use client";

import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useSession } from "next-auth/react";

export function PersonalBalanceHint({ summary }: { summary: MonthlySummary }) {
  const { data: session } = useSession();
  const ledgerId = session?.user?.ledgerUserId;
  if (!ledgerId) return null;

  const row = summary.balances.find((b) => b.userId === ledgerId);
  if (!row) return null;

  const b = row.balance;
  if (Math.abs(b) < 0.01) {
    return (
      <p className="text-sm text-muted-foreground">
        Your ledger balance this period is even with the group.
      </p>
    );
  }
  if (b > 0) {
    return (
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        You are owed {formatInr(b)}
      </p>
    );
  }
  return (
    <p className="text-sm font-medium text-destructive">
      You owe the group {formatInr(-b)}
    </p>
  );
}
