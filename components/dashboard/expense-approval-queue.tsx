"use client";

import { approveExpenseAction, rejectExpenseAction } from "@/app/actions/expenses";
import { CategoryIcon } from "@/components/icons/category-icon";
import { ExpenseImpactPreview } from "@/components/expenses/expense-impact-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";
import { isHouseAdminUser } from "@/lib/roles";
import { formatInr } from "@/lib/utils";
import type { ExpenseCategory, ExpenseDTO, MonthlySummary, UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ExpenseApprovalQueue({
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
  const [previewExpense, setPreviewExpense] = useState<ExpenseDTO | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectExpense, setRejectExpense] = useState<ExpenseDTO | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending = [], isLoading } = useQuery({
    queryKey: queryKeys.pendingExpenses,
    queryFn: async (): Promise<ExpenseDTO[]> => {
      const r = await fetch("/api/expenses/pending");
      if (!r.ok) throw new Error("Failed to load pending expenses");
      return r.json();
    },
    enabled: isHouseAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
    enabled: isHouseAdmin && pending.length > 0,
  });

  const userNames = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u.name])),
    [users],
  );

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await approveExpenseAction(id);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Expense approved");
      setPreviewOpen(false);
      setPreviewExpense(null);
      qc.invalidateQueries({ queryKey: queryKeys.pendingExpenses });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const r = await rejectExpenseAction(input);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Expense rejected");
      setRejectExpense(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: queryKeys.pendingExpenses });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isHouseAdmin) return null;

  const previewInput = previewExpense
    ? {
        amount: previewExpense.amount,
        paidBy: previewExpense.paidBy,
        splitEnabled: previewExpense.splitEnabled !== false,
        splitMode: previewExpense.splitMode === "custom" ? ("custom" as const) : ("equal" as const),
        splitBetween: previewExpense.splitBetween,
        splitAmounts: previewExpense.splitAmounts,
        currency: previewExpense.currency as "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD" | undefined,
        originalAmount: previewExpense.originalAmount,
        exchangeRate: previewExpense.exchangeRate,
      }
    : null;

  return (
    <>
      <section className="dashboard-surface col-span-12 p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Pending approvals</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.pendingExpensesCount > 0
              ? `${summary.pendingExpensesCount} expense${summary.pendingExpensesCount === 1 ? "" : "s"} awaiting review`
              : "No pending expenses"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading queue…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up — nothing to approve.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {pending.map((expense) => (
              <li
                key={expense._id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CategoryIcon
                    category={expense.category as ExpenseCategory}
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="font-medium">{expense.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatInr(expense.amount)} · Paid by {userNames[expense.paidBy] ?? "?"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setRejectExpense(expense);
                      setRejectReason("");
                    }}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    disabled={approveMut.isPending}
                    onClick={() => {
                      setPreviewExpense(expense);
                      setPreviewOpen(true);
                    }}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExpenseImpactPreview
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewExpense(null);
        }}
        input={previewInput}
        userNames={userNames}
        currentBalances={currentBalances}
        title="Approve expense — review impact"
        busy={approveMut.isPending}
        onConfirm={() => previewExpense && approveMut.mutate(previewExpense._id)}
      />

      <Dialog
        open={rejectExpense != null}
        onOpenChange={(o) => {
          if (!o) {
            setRejectExpense(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="rounded-xl"
              rows={3}
              placeholder="Why is this being rejected?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setRejectExpense(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={rejectMut.isPending || rejectReason.trim().length < 3}
              onClick={() =>
                rejectExpense &&
                rejectMut.mutate({ id: rejectExpense._id, reason: rejectReason.trim() })
              }
            >
              {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
