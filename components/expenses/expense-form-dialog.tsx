"use client";

import { createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ExpenseDTO, UserDTO } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  users: UserDTO[];
  monthKey: string;
  expense: ExpenseDTO | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export function ExpenseFormDialog({ users, monthKey, expense, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Groceries");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  const [dateStr, setDateStr] = useState("");
  const [notes, setNotes] = useState("");
  const [billImage, setBillImage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setSplitIds(new Set(expense.splitBetween));
      setDateStr(expense.date.slice(0, 10));
      setNotes(expense.notes ?? "");
      setBillImage(expense.billImage ?? "");
    } else if (users.length) {
      setTitle("");
      setAmount("");
      setCategory("Groceries");
      setPaidBy(users[0]._id);
      setSplitIds(new Set(users.map((u) => u._id)));
      setDateStr(new Date().toISOString().slice(0, 10));
      setNotes("");
      setBillImage("");
    }
  }, [expense, open, users]);

  const mut = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!title.trim() || !paidBy || splitIds.size === 0 || !dateStr || !(amt > 0)) {
        throw new Error("Fill title, amount, payer, split, and date");
      }
      const payload = {
        title: title.trim(),
        amount: amt,
        category: category as (typeof EXPENSE_CATEGORIES)[number],
        paidBy,
        splitBetween: Array.from(splitIds),
        date: new Date(dateStr),
        notes: notes.trim() || undefined,
        billImage: billImage.trim() || undefined,
      };
      if (expense) {
        const r = await updateExpenseAction({ id: expense._id, ...payload });
        if (!r.ok) throw new Error(r.error);
        return r.data;
      }
      const r = await createExpenseAction(payload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success(expense ? "Expense updated" : "Expense added");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setBillImage(data.url as string);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Groceries, rent…"
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].emoji} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Bill image</Label>
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              disabled={uploading}
              onChange={(e) => onUploadFile(e.target.files?.[0] ?? null)}
            />
            {billImage ? (
              <Input
                readOnly
                value={billImage}
                className="rounded-xl text-xs text-muted-foreground"
              />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="rounded-xl"
            disabled={mut.isPending || uploading}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
