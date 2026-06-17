"use client";

import { linkPreBillExpenseAction } from "@/app/actions/pre-bills";
import { ExpenseImpactPreview } from "@/components/expenses/expense-impact-preview";
import { CategoryIcon } from "@/components/icons/category-icon";
import { LottieSuccessMoment } from "@/components/lottie/lottie-success-moment";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpenseAction } from "@/app/actions/expenses";
import { roundMoney } from "@/lib/ledger";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { ExpenseCategory, ExpenseDTO, PreBillDTO, UserDTO } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PreBillSeed = {
  title: string;
  category: ExpenseCategory;
  notes: string;
  suggestedAmount?: number;
};

export function PreBillExpenseWizard({
  preBill,
  preBillSeed,
  users,
  monthKey,
  open,
  onOpenChange,
  defaultPaidById,
  currentBalances,
  onLinked,
}: {
  preBill: PreBillDTO;
  preBillSeed: PreBillSeed;
  users: UserDTO[];
  monthKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPaidById?: string;
  currentBalances: Record<string, number>;
  onLinked?: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addedExpense, setAddedExpense] = useState<ExpenseDTO | null>(null);

  const userNames = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u.name])),
    [users],
  );

  function resetForm() {
    setStep(0);
    const payer =
      defaultPaidById && users.some((u) => u._id === defaultPaidById)
        ? defaultPaidById
        : users[0]?._id ?? "";
    setPaidBy(payer);
    setAmount(
      preBillSeed.suggestedAmount != null && preBillSeed.suggestedAmount > 0
        ? String(preBillSeed.suggestedAmount)
        : "",
    );
    setSplitEnabled(true);
    setSplitMode("equal");
    setSplitIds(new Set(users.map((u) => u._id)));
    setPreviewOpen(false);
  }

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (o && users.length) resetForm();
  }

  const amt = Number(amount);
  const previewInput =
    amt > 0 && paidBy
      ? {
          amount: amt,
          paidBy,
          splitEnabled,
          splitMode,
          splitBetween: Array.from(splitIds),
        }
      : null;

  const createMut = useMutation({
    mutationFn: async () => {
      if (!(amt > 0) || !paidBy) throw new Error("Enter amount and payer");
      if (splitEnabled && splitIds.size === 0) throw new Error("Pick at least one person to split with");
      const r = await createExpenseAction({
        title: preBillSeed.title,
        amount: amt,
        category: preBillSeed.category,
        paidBy,
        splitEnabled,
        splitMode: splitEnabled ? splitMode : "equal",
        splitBetween: splitEnabled ? Array.from(splitIds) : [],
        splitAmounts: undefined,
        date: new Date(),
        notes: preBillSeed.notes,
      });
      if (!r.ok) throw new Error(r.error);
      const link = await linkPreBillExpenseAction({
        preBillId: preBill._id,
        expenseId: r.data._id,
      });
      if (!link.ok) throw new Error(link.error);
      return r.data;
    },
    onSuccess: (data: ExpenseDTO) => {
      qc.invalidateQueries({ queryKey: ["preBill", preBill._id] });
      qc.invalidateQueries({ queryKey: queryKeys.preBills() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setPreviewOpen(false);
      onOpenChange(false);
      setAddedExpense(data);
      onLinked?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const estimatedTotal = preBillSeed.suggestedAmount ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Book as expense — {preBillSeed.title}</DialogTitle>
          </DialogHeader>

          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirm the final amount against your shopping list estimate.
              </p>
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated from list</span>
                  <span className="font-semibold tabular-nums">{formatInr(estimatedTotal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-amount">Final amount (₹)</Label>
                <Input
                  id="wizard-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl text-xl font-semibold"
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paid by</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Who paid" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">Split expense (IOU)</p>
                  <p className="text-xs text-muted-foreground">Off = house expense only</p>
                </div>
                <Checkbox
                  checked={splitEnabled}
                  onCheckedChange={(c) => setSplitEnabled(c === true)}
                />
              </div>
              {splitEnabled ? (
                <div className="space-y-2">
                  <Label>Split between</Label>
                  <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
                    {users.map((u) => (
                      <label key={u._id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={splitIds.has(u._id)}
                          onCheckedChange={(c) => {
                            const next = new Set(splitIds);
                            if (c) next.add(u._id);
                            else next.delete(u._id);
                            setSplitIds(next);
                          }}
                        />
                        {u.name}
                      </label>
                    ))}
                  </div>
                  {splitEnabled && splitIds.size > 0 && amt > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Equal share: {formatInr(roundMoney(amt / splitIds.size))} each
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CategoryIcon category={preBillSeed.category} className="h-4 w-4" />
                {preBillSeed.category}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            {step > 0 ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 1 ? (
              <Button
                type="button"
                className="rounded-xl"
                disabled={!(amt > 0)}
                onClick={() => {
                  if (!paidBy && users.length) setPaidBy(users[0]._id);
                  setStep(1);
                }}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-xl"
                disabled={!paidBy || (splitEnabled && splitIds.size === 0)}
                onClick={() => setPreviewOpen(true)}
              >
                Review & book
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpenseImpactPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        input={previewInput}
        userNames={userNames}
        currentBalances={currentBalances}
        title="Confirm pre-bill expense"
        busy={createMut.isPending}
        onConfirm={() => createMut.mutate()}
      />

      <LottieSuccessMoment
        open={!!addedExpense}
        onClose={() => setAddedExpense(null)}
        scene="expenseAdded"
        title="Expense recorded"
        amount={addedExpense ? formatInr(addedExpense.amount) : undefined}
        subtitle={addedExpense?.title}
      />
    </>
  );
}
