"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRE_BILL_UNITS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PreBillItemDTO } from "@/types";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";

type Props = {
  item: PreBillItemDTO;
  index: number;
  onChange: (index: number, next: PreBillItemDTO) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  canTogglePurchase?: boolean;
  /** Rows at or above this index are not persisted yet — cannot PATCH purchase. */
  serverItemCount?: number;
  onTogglePurchased?: (index: number, isPurchased: boolean) => void;
  purchaseTogglePending?: boolean;
};

export function PreBillItemRow({
  item,
  index,
  onChange,
  onRemove,
  disabled,
  canTogglePurchase = false,
  serverItemCount,
  onTogglePurchased,
  purchaseTogglePending = false,
}: Props) {
  const purchased = item.isPurchased === true;
  const countable = item.name.trim().length > 0 && item.quantity > 0;
  const rowMuted = purchased && countable;
  const persistedOnServer =
    serverItemCount === undefined ? true : index < serverItemCount;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all duration-200 sm:flex-row sm:items-end sm:gap-3",
        purchaseTogglePending && "scale-[1.01] ring-2 ring-primary/25",
        purchased && countable && "border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20",
      )}
    >
      {canTogglePurchase && onTogglePurchased ? (
        <div className="flex shrink-0 items-start gap-2 pt-1 sm:items-end sm:pb-1">
          <Checkbox
            id={`pb-purchase-${index}`}
            checked={purchased}
            disabled={
              !countable || !persistedOnServer || purchaseTogglePending || disabled
            }
            title={
              !persistedOnServer && countable
                ? "Save the list first — new rows must sync before marking purchased"
                : undefined
            }
            onCheckedChange={(v) => onTogglePurchased(index, v === true)}
            className="mt-0.5 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
            aria-label={purchased ? "Mark not purchased" : "Mark purchased"}
          />
          {purchaseTogglePending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : purchased && countable ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <label
          htmlFor={`pb-item-name-${index}`}
          className={cn(
            "text-xs font-medium text-muted-foreground",
            rowMuted && "line-through opacity-60",
          )}
        >
          Item
        </label>
        <Input
          id={`pb-item-name-${index}`}
          value={item.name}
          onChange={(e) => onChange(index, { ...item, name: e.target.value })}
          placeholder="Oil, sugar…"
          disabled={disabled}
          className={cn("rounded-xl", rowMuted && "line-through opacity-60")}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:max-w-[280px] sm:gap-3">
        <div className="space-y-1.5">
          <label className={cn("text-xs font-medium text-muted-foreground", rowMuted && "opacity-60")}>
            Qty
          </label>
          <Input
            type="number"
            min={0.01}
            step="any"
            value={item.quantity || ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(index, { ...item, quantity: Number.isFinite(v) ? v : 0 });
            }}
            disabled={disabled}
            className={cn("rounded-xl", rowMuted && "line-through opacity-60")}
          />
        </div>
        <div className="space-y-1.5">
          <label className={cn("text-xs font-medium text-muted-foreground", rowMuted && "opacity-60")}>
            Unit
          </label>
          <Select
            value={item.unit}
            onValueChange={(u) =>
              onChange(index, { ...item, unit: u as PreBillItemDTO["unit"] })
            }
            disabled={disabled}
          >
            <SelectTrigger className={cn("rounded-xl", rowMuted && "opacity-60")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {PRE_BILL_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1 sm:w-28">
          <label className={cn("text-xs font-medium text-muted-foreground", rowMuted && "opacity-60")}>
            Price (₹)
          </label>
          <Input
            type="number"
            min={0}
            step="1"
            value={item.price ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                const { price: _, ...rest } = item;
                onChange(index, rest as PreBillItemDTO);
                return;
              }
              const v = Number(raw);
              if (Number.isFinite(v) && v >= 0) {
                onChange(index, { ...item, price: v });
              }
            }}
            placeholder="Optional"
            disabled={disabled}
            className={cn("rounded-xl", rowMuted && "opacity-60")}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
        disabled={disabled}
        onClick={() => onRemove(index)}
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
