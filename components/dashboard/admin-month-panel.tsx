"use client";

import { amendMonthBudgetAction, startNewMonthAction } from "@/app/actions/house-month";
import { AmountSummaryDialog } from "@/components/ui/amount-summary-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nextMonthKey } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { isHouseAdminUser } from "@/lib/roles";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function AdminMonthPanel({
  monthKey,
  summary,
  initialAmendAmount,
  onInitialAmendConsumed,
}: {
  monthKey: string;
  summary: MonthlySummary;
  initialAmendAmount?: number | null;
  onInitialAmendConsumed?: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const isHouseAdmin = isHouseAdminUser(session?.user);
  const existingBudget = summary.monthBudget ?? 0;
  const [addAmountInput, setAddAmountInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextBudgetInput, setNextBudgetInput] = useState("30000");
  const [carryForward, setCarryForward] = useState(true);
  const [busy, setBusy] = useState(false);
  const consumedPrefill = useRef<number | null>(null);

  useEffect(() => {
    if (initialAmendAmount == null || initialAmendAmount <= 0) return;
    if (consumedPrefill.current === initialAmendAmount) return;
    consumedPrefill.current = initialAmendAmount;
    setAddAmountInput(String(initialAmendAmount));
    setConfirmOpen(true);
    onInitialAmendConsumed?.();
  }, [initialAmendAmount, onInitialAmendConsumed]);

  if (!isHouseAdmin) return null;

  const addAmount = parseAmount(addAmountInput);
  const newTotal = addAmount != null ? existingBudget + addAmount : null;

  function openConfirm() {
    if (addAmount == null) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmAmend() {
    if (addAmount == null) return;
    setBusy(true);
    try {
      const r = await amendMonthBudgetAction(monthKey, addAmount);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Wallet amended — new total ${formatInr(r.data.budget)}`);
      setAddAmountInput("");
      setConfirmOpen(false);
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.walletHistory(monthKey) });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function startNext() {
    const n = Number(nextBudgetInput.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid budget for next month");
      return;
    }
    setBusy(true);
    try {
      const r = await startNewMonthAction(monthKey, n, carryForward);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Started ${r.data.nextMonthKey}`);
      const next = nextMonthKey(monthKey);
      router.push(`/dashboard?month=${encodeURIComponent(next)}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const next = nextMonthKey(monthKey);

  return (
    <>
      <section className="dashboard-surface col-span-12 border-dashed p-6 md:p-8">
        <h3 className="text-lg font-semibold tracking-tight">Admin · Monthly wallet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add funds to the house wallet for {monthKey}, or roll forward to {next}.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current wallet budget
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {existingBudget > 0 ? formatInr(existingBudget) : "Not set"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-add-amount">Amount to add</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="admin-add-amount"
                  type="text"
                  inputMode="decimal"
                  className="max-w-xs rounded-xl"
                  value={addAmountInput}
                  onChange={(e) => setAddAmountInput(e.target.value)}
                  placeholder="e.g. 5000"
                />
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={busy || addAmount == null}
                  onClick={openConfirm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Amend wallet
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adds to the existing budget — does not replace it.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Start next month ({next})</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="text"
                inputMode="decimal"
                className="max-w-[10rem] rounded-xl"
                value={nextBudgetInput}
                onChange={(e) => setNextBudgetInput(e.target.value)}
                placeholder="Budget"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={carryForward}
                  onChange={(e) => setCarryForward(e.target.checked)}
                />
                Carry forward prefs
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              disabled={busy}
              onClick={startNext}
            >
              Reset month & notify Telegram
            </Button>
          </div>
        </div>
      </section>

      <AmountSummaryDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm wallet amend"
        description={`Review the amounts below for ${monthKey} before confirming.`}
        rows={
          addAmount != null
            ? [
                { label: "Existing budget", value: existingBudget },
                { label: "Amount to add", value: addAmount, positive: true },
                { label: "New total", value: newTotal ?? 0, emphasize: true },
              ]
            : []
        }
        confirmLabel="Confirm amend"
        busy={busy}
        onConfirm={confirmAmend}
      />
    </>
  );
}
