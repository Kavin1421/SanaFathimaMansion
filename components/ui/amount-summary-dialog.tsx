"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatInr } from "@/lib/utils";

export type AmountSummaryRow = {
  label: string;
  value: number;
  emphasize?: boolean;
  positive?: boolean;
};

export function AmountSummaryDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: AmountSummaryRow[];
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <div className="rounded-xl border bg-muted/30 divide-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className={row.emphasize ? "font-medium" : "text-muted-foreground"}>
                {row.label}
              </span>
              <span
                className={`tabular-nums ${row.emphasize ? "text-lg font-bold" : "font-semibold"} ${
                  row.positive ? "text-emerald-600 dark:text-emerald-400" : ""
                }`}
              >
                {row.positive && row.value > 0 ? "+" : ""}
                {formatInr(row.value)}
              </span>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" disabled={busy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {busy ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
