"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patchPreBillItemPurchased } from "@/lib/pre-bill-purchase-api";
import { cn } from "@/lib/utils";
import type { PreBillDTO } from "@/types";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PreBillShoppingProgress } from "./pre-bill-shopping-progress";

function formatLine(item: PreBillDTO["items"][number]): string {
  const qty =
    item.quantity % 1 === 0 ? String(item.quantity) : String(item.quantity);
  const qtyUnit = item.unit === "pcs" ? `${qty} ${item.unit}` : `${qty}${item.unit}`;
  const price =
    typeof item.price === "number" ? ` · ₹${item.price.toLocaleString("en-IN")}` : "";
  return `${item.name} - ${qtyUnit}${price}`;
}

export function PreBillReadonlyShoppingList({
  preBill,
  canToggle,
  onUpdated,
}: {
  preBill: PreBillDTO;
  canToggle: boolean;
  onUpdated: () => void;
}) {
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  const displayOrder = useMemo(() => {
    const n = preBill.items.length;
    let idxs = Array.from({ length: n }, (_, i) => i);
    idxs = [...idxs].sort((a, b) => {
      const ita = preBill.items[a]!;
      const itb = preBill.items[b]!;
      const ca = ita.name.trim() && ita.quantity > 0;
      const cb = itb.name.trim() && itb.quantity > 0;
      const pa = ca && ita.isPurchased ? 1 : 0;
      const pb = cb && itb.isPurchased ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a - b;
    });
    if (showPendingOnly) {
      idxs = idxs.filter((i) => {
        const it = preBill.items[i]!;
        if (!(it.name.trim() && it.quantity > 0)) return false;
        return !it.isPurchased;
      });
    }
    return idxs;
  }, [preBill.items, showPendingOnly]);

  async function toggle(i: number, next: boolean) {
    if (!canToggle) return;
    const row = preBill.items[i];
    if (!row?.name.trim() || row.quantity <= 0) return;
    setBusyIdx(i);
    try {
      await patchPreBillItemPurchased(preBill._id, i, next);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyIdx(null);
    }
  }

  return (
    <Card className="rounded-2xl border shadow-md transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="space-y-4">
        <CardTitle className="text-lg">Shopping checklist</CardTitle>
        <PreBillShoppingProgress
          items={preBill.items}
          showPendingOnly={showPendingOnly}
          onShowPendingOnlyChange={setShowPendingOnly}
          filterId="pb-readonly-pending"
        />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {displayOrder.map((i) => {
            const item = preBill.items[i]!;
            const purchased = item.isPurchased === true;
            const countable = item.name.trim().length > 0 && item.quantity > 0;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-card px-3 py-3 transition-colors",
                  purchased && countable && "border-emerald-200/80 bg-emerald-50/25 dark:border-emerald-900/35",
                )}
              >
                {canToggle ? (
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <Checkbox
                      checked={purchased}
                      disabled={!countable || busyIdx === i}
                      onCheckedChange={(v) => void toggle(i, v === true)}
                      className="data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                      aria-label={purchased ? "Mark not purchased" : "Mark purchased"}
                    />
                    {busyIdx === i ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : purchased && countable ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                  </div>
                ) : purchased && countable ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium leading-snug",
                    purchased && countable && "line-through opacity-60",
                  )}
                >
                  {formatLine(item)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
