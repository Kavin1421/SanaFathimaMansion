"use client";

import { PremiumEmptyState } from "@/components/lottie/premium-empty-state";
import { contributeSavingsGoalAction, createSavingsGoalAction } from "@/app/actions/savings-goals";
import { AmountSummaryDialog } from "@/components/ui/amount-summary-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { SavingsGoalDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PiggyBank, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function SavingsGoalsCard() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [contributeGoal, setContributeGoal] = useState<SavingsGoalDTO | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: queryKeys.savingsGoals,
    queryFn: async (): Promise<SavingsGoalDTO[]> => {
      const r = await fetch("/api/savings-goals");
      if (!r.ok) throw new Error("Failed to load savings goals");
      return r.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const target = parseAmount(newTarget);
      if (!newTitle.trim() || target == null) throw new Error("Enter title and target amount");
      const r = await createSavingsGoalAction({ title: newTitle.trim(), targetAmount: target });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Savings goal created");
      setCreateOpen(false);
      setNewTitle("");
      setNewTarget("");
      qc.invalidateQueries({ queryKey: queryKeys.savingsGoals });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contributeMut = useMutation({
    mutationFn: async () => {
      if (!contributeGoal) throw new Error("No goal selected");
      const amt = parseAmount(contributeAmount);
      if (amt == null) throw new Error("Enter a valid amount");
      const r = await contributeSavingsGoalAction({ id: contributeGoal._id, amount: amt });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Contribution added");
      setConfirmOpen(false);
      setContributeGoal(null);
      setContributeAmount("");
      qc.invalidateQueries({ queryKey: queryKeys.savingsGoals });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeGoals = goals.filter((g) => g.active);
  const addAmount = parseAmount(contributeAmount);

  return (
    <>
      <section className="dashboard-surface col-span-12 p-6 md:col-span-6 md:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Savings goals</h3>
              <p className="mt-1 text-sm text-muted-foreground">Household side pots</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New goal
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : activeGoals.length === 0 ? (
          <PremiumEmptyState
            scene="emptyInbox"
            title="No savings goals yet"
            description="Create a household side pot to track together."
            compact
          />
        ) : (
          <ul className="space-y-4">
            {activeGoals.map((goal) => (
              <li key={goal._id} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{goal.title}</p>
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {formatInr(goal.currentAmount)} of {formatInr(goal.targetAmount)}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                        style={{ width: `${Math.min(100, goal.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setContributeGoal(goal);
                      setContributeAmount("");
                      setConfirmOpen(false);
                    }}
                  >
                    Contribute
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-xl"
                placeholder="Trip fund"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target amount (₹)</Label>
              <Input
                id="goal-target"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="rounded-xl"
                inputMode="decimal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {contributeGoal && !confirmOpen ? (
        <Dialog
          open={Boolean(contributeGoal)}
          onOpenChange={(o) => {
            if (!o) setContributeGoal(null);
          }}
        >
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contribute to {contributeGoal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="contribute-amt">Amount (₹)</Label>
              <Input
                id="contribute-amt"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                className="rounded-xl"
                inputMode="decimal"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setContributeGoal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={addAmount == null}
                onClick={() => setConfirmOpen(true)}
              >
                Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AmountSummaryDialog
        open={confirmOpen && contributeGoal != null}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setContributeGoal(null);
        }}
        title="Confirm contribution"
        description={contributeGoal ? `Adding to ${contributeGoal.title}` : undefined}
        rows={
          contributeGoal && addAmount != null
            ? [
                { label: "Current saved", value: contributeGoal.currentAmount },
                { label: "Contribution", value: addAmount, positive: true },
                { label: "New total", value: contributeGoal.currentAmount + addAmount, emphasize: true },
              ]
            : []
        }
        confirmLabel="Confirm contribution"
        busy={contributeMut.isPending}
        onConfirm={() => contributeMut.mutate()}
      />
    </>
  );
}
