"use client";

import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { WalletAmendmentDTO } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { useState } from "react";

export function WalletFundingHistory({ monthKey }: { monthKey: string }) {
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: queryKeys.walletHistory(monthKey),
    queryFn: async (): Promise<WalletAmendmentDTO[]> => {
      const r = await fetch(`/api/wallet/history?month=${encodeURIComponent(monthKey)}`);
      if (!r.ok) throw new Error("Failed to load funding history");
      return r.json();
    },
    enabled: open,
  });

  return (
    <div className="rounded-xl border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Funding history
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t px-4 pb-4 pt-2">
          {isLoading ? (
            <p className="py-3 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">No wallet top-ups this month.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{row.performedByName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(row.createdAt), "d MMM yyyy · HH:mm")}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatInr(row.additionalAmount)}
                    </span>
                    <p className="text-xs text-muted-foreground">→ {formatInr(row.newBudget)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
