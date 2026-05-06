"use client";

import { addExpenseCommentAction, toggleExpenseReactionAction } from "@/app/actions/expenses";
import { BillImagePanel } from "@/components/bill-image-panel";
import { CategoryIcon } from "@/components/icons/category-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ExpenseCategory } from "@/lib/constants";
import { formatInr } from "@/lib/utils";
import type { ExpenseDTO, UserDTO } from "@/types";
import { roundMoney } from "@/lib/ledger";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Flame, ThumbsUp, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  expense: ExpenseDTO | null;
  users: UserDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailBody({ expense, users }: { expense: ExpenseDTO; users: UserDTO[] }) {
  const userMap = new Map(users.map((u) => [u._id, u.name]));
  const cat = expense.category as ExpenseCategory;
  const splitNames = expense.splitBetween.map((id) => userMap.get(id) ?? id).join(", ");
  const share =
    expense.splitEnabled !== false && expense.splitBetween.length > 0
      ? roundMoney(expense.amount / expense.splitBetween.length)
      : null;
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [comment, setComment] = useState("");
  const reactionOptions = useMemo(
    () => [
      { value: "👍", Icon: ThumbsUp },
      { value: "🔥", Icon: Flame },
      { value: "💸", Icon: Wallet },
      { value: "✅", Icon: Check },
    ],
    [],
  );
  const comments = useMemo(() => expense.comments ?? [], [expense.comments]);
  const reactions = useMemo(() => expense.reactions ?? [], [expense.reactions]);
  const myAccountId = session?.user?.id;
  const groupedReactions = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reactions) m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
    return m;
  }, [reactions]);

  const commentMut = useMutation({
    mutationFn: async () => {
      const r = await addExpenseCommentAction({ expenseId: expense._id, text: comment });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactionMut = useMutation({
    mutationFn: async (emoji: string) => {
      const r = await toggleExpenseReactionAction({ expenseId: expense._id, emoji });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 py-1 text-sm">
      <div className="grid gap-1 border-b pb-4">
        <p className="text-2xl font-semibold tabular-nums">{formatInr(expense.amount)}</p>
        <p className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CategoryIcon category={cat} className="h-4 w-4" />
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
            <p className="break-words">{splitNames}</p>
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
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reactions</p>
        <div className="flex flex-wrap gap-2">
          {reactionOptions.map(({ value, Icon }) => {
            const mine = reactions.some((r) => r.accountId === myAccountId && r.emoji === value);
            return (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={mine ? "default" : "outline"}
                className="h-9 rounded-xl"
                onClick={() => reactionMut.mutate(value)}
                disabled={reactionMut.isPending}
              >
                <Icon className="mr-1 h-4 w-4" />
                {groupedReactions.get(value) ?? 0}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comments</p>
        <div className="space-y-2">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : (
            comments
              .slice()
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((c) => (
                <div key={c._id} className="rounded-xl border bg-muted/20 px-3 py-2">
                  <p className="text-xs font-medium">{c.authorName}</p>
                  <p className="text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))
          )}
        </div>
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[96px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
            placeholder="Add comment..."
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              onClick={() => commentMut.mutate()}
              disabled={commentMut.isPending || comment.trim().length < 1}
            >
              Add comment
            </Button>
          </div>
        </div>
      </div>
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
