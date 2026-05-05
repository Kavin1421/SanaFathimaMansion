"use client";

import { settleAction } from "@/app/actions/settlements";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function OwesList({ summary, monthKey }: { summary: MonthlySummary; monthKey: string }) {
  const qc = useQueryClient();
  const settleMut = useMutation({
    mutationFn: async (p: { fromUser: string; toUser: string; amount: number }) => {
      const r = await settleAction({
        fromUser: p.fromUser,
        toUser: p.toUser,
        amount: p.amount,
        date: new Date(),
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Settlement recorded");
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { suggestions } = summary;

  return (
    <section className="dashboard-surface col-span-12 p-6 md:p-8">
      <div className="mb-8">
        <h3 className="text-lg font-semibold tracking-tight">Who owes whom</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Suggested transfers to settle up — same math as Splitwise-style simplified debts.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone is square. Nothing to settle.</p>
      ) : (
        <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {suggestions.map((x, i) => (
            <li
              key={`${x.fromUserId}-${x.toUserId}-${i}`}
              className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar className="h-11 w-11 border border-slate-200/80 shadow-sm dark:border-slate-700">
                  <AvatarFallback className="bg-red-500/10 text-sm font-semibold text-red-700 dark:text-red-400">
                    {initials(x.fromName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">Owes</p>
                  <p className="text-sm leading-relaxed sm:text-base">
                    <span className="font-semibold text-red-600 dark:text-red-400">{x.fromName}</span>
                    <span className="text-muted-foreground"> owes </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {x.toName}
                    </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {" "}
                      {formatInr(x.amount)}
                    </span>
                  </p>
                </div>

                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" />

                <Avatar className="hidden h-11 w-11 border border-slate-200/80 shadow-sm dark:border-slate-700 sm:flex">
                  <AvatarFallback className="bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {initials(x.toName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Button
                className="w-full shrink-0 rounded-xl sm:w-auto"
                disabled={settleMut.isPending}
                onClick={() =>
                  settleMut.mutate({
                    fromUser: x.fromUserId,
                    toUser: x.toUserId,
                    amount: x.amount,
                  })
                }
              >
                Mark as Settled
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
