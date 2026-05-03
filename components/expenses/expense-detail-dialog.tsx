"use client";

import { BillImagePanel } from "@/components/bill-image-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { formatInr } from "@/lib/utils";
import type { ExpenseDTO, UserDTO } from "@/types";
import { roundMoney } from "@/lib/ledger";
import { useEffect, useState } from "react";

type Props = {
  expense: ExpenseDTO | null;
  users: UserDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailBody({ expense, users }: { expense: ExpenseDTO; users: UserDTO[] }) {
  const userMap = new Map(users.map((u) => [u._id, u.name]));
  const cat = expense.category as ExpenseCategory;
  const meta = CATEGORY_META[cat];
  const splitNames = expense.splitBetween.map((id) => userMap.get(id) ?? id).join(", ");
  const share =
    expense.splitEnabled !== false && expense.splitBetween.length > 0
      ? roundMoney(expense.amount / expense.splitBetween.length)
      : null;

  return (
    <div className="space-y-5 py-1 text-sm">
      <div className="grid gap-1 border-b pb-4">
        <p className="text-2xl font-semibold tabular-nums">{formatInr(expense.amount)}</p>
        <p className="text-muted-foreground">
          <span className="mr-1">{meta.emoji}</span>
          {expense.category} · Paid by {userMap.get(expense.paidBy) ?? "?"}
        </p>
        <p className="text-muted-foreground">{new Date(expense.date).toLocaleDateString(undefined, { dateStyle: "long" })}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Split</p>
        {expense.splitEnabled === false ? (
          <p>House expense — balances unchanged</p>
        ) : (
          <>
            <p>{splitNames}</p>
            {share != null && expense.splitBetween.length > 1 ? (
              <p className="text-muted-foreground">
                Each member owes {formatInr(share)} ({expense.splitBetween.length} people)
              </p>
            ) : null}
          </>
        )}
      </div>
      {(expense.description?.trim() || expense.notes?.trim()) && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{expense.description ?? expense.notes}</p>
        </div>
      )}
      {expense.billImage ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bill</p>
          <BillImagePanel key={expense._id} src={expense.billImage} title={expense.title} />
        </div>
      ) : null}
    </div>
  );
}

export function ExpenseDetailDialog({ expense, users, open, onOpenChange }: Props) {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  if (!expense) return null;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{expense.title}</DialogTitle>
          </DialogHeader>
          <DetailBody expense={expense} users={users} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[92vh] flex-col rounded-t-2xl p-4">
        <SheetHeader className="text-left">
          <SheetTitle>{expense.title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <DetailBody expense={expense} users={users} />
        </div>
        <div className="border-t pt-3">
          <Button type="button" variant="secondary" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
