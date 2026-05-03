"use client";

import { setMonthBudgetAction, startNewMonthAction } from "@/app/actions/house-month";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nextMonthKey } from "@/lib/dates";
import type { MonthlySummary } from "@/types";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function AdminMonthPanel({
  monthKey,
  summary,
}: {
  monthKey: string;
  summary: MonthlySummary;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = Boolean(session?.user?.isSuperAdmin);
  const [budgetInput, setBudgetInput] = useState(
    summary.monthBudget != null ? String(summary.monthBudget) : "30000",
  );
  const [nextBudgetInput, setNextBudgetInput] = useState("30000");
  const [carryForward, setCarryForward] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!isSuperAdmin) return null;

  async function saveBudget() {
    const n = Number(budgetInput.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid budget");
      return;
    }
    setBusy(true);
    try {
      const r = await setMonthBudgetAction(monthKey, n);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Budget saved");
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
    <section className="dashboard-surface col-span-12 border-dashed p-6 md:p-8">
      <h3 className="text-lg font-semibold tracking-tight">Admin · Monthly wallet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Set the house budget for the selected month, or roll forward to {next}.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="admin-budget">Budget for {monthKey}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="admin-budget"
              type="text"
              inputMode="decimal"
              className="max-w-xs rounded-xl"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
            <Button type="button" className="rounded-xl" disabled={busy} onClick={saveBudget}>
              Save budget
            </Button>
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
            Reset month & notify WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}
