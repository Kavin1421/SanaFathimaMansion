"use client";

import { postRecurringExpenseAction } from "@/app/actions/recurring-expenses";
import { CategoryIcon } from "@/components/icons/category-icon";
import { ExpenseImpactPreview } from "@/components/expenses/expense-impact-preview";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { isHouseAdminUser } from "@/lib/roles";
import { formatInr } from "@/lib/utils";
import type { ExpenseCategory, MonthlySummary, RecurringExpenseDTO, UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function RecurringExpensesBanner({
  monthKey,
  summary,
  currentBalances,
}: {
  monthKey: string;
  summary: MonthlySummary;
  currentBalances: Record<string, number>;
}) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isHouseAdmin = isHouseAdminUser(session?.user);
  const [previewItem, setPreviewItem] = useState<RecurringExpenseDTO | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: recurring = [] } = useQuery({
    queryKey: queryKeys.recurringExpenses,
    queryFn: async (): Promise<RecurringExpenseDTO[]> => {
      const r = await fetch("/api/recurring-expenses");
      if (!r.ok) throw new Error("Failed to load recurring expenses");
      return r.json();
    },
    enabled: isHouseAdmin && summary.recurringDueCount > 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
    enabled: isHouseAdmin && summary.recurringDueCount > 0,
  });

  const userNames = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u.name])),
    [users],
  );

  const dueItems = useMemo(
    () =>
      recurring.filter(
        (r) => r.active && r.lastPostedMonthKey !== monthKey,
      ),
    [recurring, monthKey],
  );

  const postMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await postRecurringExpenseAction({ id, monthKey });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Recurring expense posted");
      setPreviewOpen(false);
      setPreviewItem(null);
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: queryKeys.recurringExpenses });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isHouseAdmin || summary.recurringDueCount === 0) return null;

  const previewInput = previewItem
    ? {
        amount: previewItem.amount,
        paidBy: previewItem.paidBy,
        splitEnabled: previewItem.splitEnabled,
        splitMode: previewItem.splitMode,
        splitBetween: previewItem.splitBetween,
      }
    : null;

  return (
    <>
      <section className="dashboard-surface col-span-12 border-dashed p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Recurring due</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.recurringDueCount} template{summary.recurringDueCount === 1 ? "" : "s"} ready to post for{" "}
                {summary.monthLabel}
              </p>
            </div>
          </div>
        </div>

        {dueItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading recurring templates…</p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border bg-muted/20">
            {dueItems.map((item) => (
              <li
                key={item._id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryIcon
                    category={item.category as ExpenseCategory}
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Day {item.dayOfMonth} · {formatInr(item.amount)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  disabled={postMut.isPending}
                  onClick={() => {
                    setPreviewItem(item);
                    setPreviewOpen(true);
                  }}
                >
                  Post now
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExpenseImpactPreview
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewItem(null);
        }}
        input={previewInput}
        userNames={userNames}
        currentBalances={currentBalances}
        title="Preview recurring post"
        busy={postMut.isPending}
        onConfirm={() => previewItem && postMut.mutate(previewItem._id)}
      />
    </>
  );
}
