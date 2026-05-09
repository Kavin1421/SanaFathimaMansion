"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRE_BILL_UNITS } from "@/lib/constants";
import type { PreBillItemDTO } from "@/types";
import { Trash2 } from "lucide-react";

type Props = {
  item: PreBillItemDTO;
  index: number;
  onChange: (index: number, next: PreBillItemDTO) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
};

export function PreBillItemRow({ item, index, onChange, onRemove, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Item</label>
        <Input
          value={item.name}
          onChange={(e) => onChange(index, { ...item, name: e.target.value })}
          placeholder="Oil, sugar…"
          disabled={disabled}
          className="rounded-xl"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:max-w-[280px] sm:gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Qty</label>
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
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Unit</label>
          <Select
            value={item.unit}
            onValueChange={(u) =>
              onChange(index, { ...item, unit: u as PreBillItemDTO["unit"] })
            }
            disabled={disabled}
          >
            <SelectTrigger className="rounded-xl">
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
          <label className="text-xs font-medium text-muted-foreground">Price (₹)</label>
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
            className="rounded-xl"
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
