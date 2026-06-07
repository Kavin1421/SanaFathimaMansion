"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  computeExpensePreview,
  isPreviewInputValid,
  type ExpensePreviewInput,
  type ExpensePreviewResult,
  resolveInrAmount,
} from "@/lib/expense-preview";
import { formatInr } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function ExpenseImpactPreview({
  open,
  onOpenChange,
  input,
  userNames,
  currentBalances,
  onConfirm,
  busy = false,
  title = "Review expense impact",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: ExpensePreviewInput | null;
  userNames: Record<string, string>;
  currentBalances: Record<string, number>;
  onConfirm: () => void;
  busy?: boolean;
  title?: string;
}) {
  let preview: ExpensePreviewResult | null = null;
  if (open && input && isPreviewInputValid(input)) {
    const inrAmount = resolveInrAmount(input);
    preview = computeExpensePreview({ ...input, inrAmount }, currentBalances, userNames);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {!preview ? (
          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 divide-y">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Total (INR)</span>
                <span className="text-lg font-bold tabular-nums">{formatInr(preview.inrAmount)}</span>
              </div>
              {preview.currencyLabel ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">{preview.currencyLabel}</div>
              ) : null}
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Wallet impact</span>
                <span className="font-semibold tabular-nums">{formatInr(preview.walletImpact)}</span>
              </div>
            </div>

            {preview.isHouseExpense ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                House expense — affects wallet only, no IOU split.
              </p>
            ) : preview.perPersonShares.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Per-person share</p>
                <ul className="rounded-xl border bg-muted/20 divide-y">
                  {preview.perPersonShares.map((row) => (
                    <li key={row.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span>{row.name}</span>
                      <span className="font-semibold tabular-nums">{formatInr(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.balanceDeltas.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Balance changes</p>
                <ul className="space-y-2">
                  {preview.balanceDeltas.map((row) => (
                    <li
                      key={row.userId}
                      className="flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium">{row.name}</span>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="tabular-nums text-muted-foreground">{formatInr(row.before)}</span>
                        <span>→</span>
                        <span className="font-semibold tabular-nums">{formatInr(row.after)}</span>
                        <Badge variant={row.delta >= 0 ? "success" : "danger"}>
                          {row.delta >= 0 ? "+" : ""}
                          {formatInr(row.delta)}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No net balance changes for this expense.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Back
          </Button>
          <Button type="button" className="rounded-xl" disabled={busy || !preview} onClick={onConfirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm & save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
