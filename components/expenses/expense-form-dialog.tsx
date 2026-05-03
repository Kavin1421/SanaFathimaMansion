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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { ExpenseDTO, UserDTO } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  users: UserDTO[];
  monthKey: string;
  expense: ExpenseDTO | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

function FormFields({
  title,
  setTitle,
  amount,
  setAmount,
  amountRef,
  category,
  setCategory,
  paidBy,
  setPaidBy,
  users,
  splitEnabled,
  setSplitEnabled,
  splitIds,
  setSplitIds,
  dateStr,
  setDateStr,
  notes,
  setNotes,
  description,
  setDescription,
  billImage,
  setBillImage,
  uploading,
  onUploadFile,
  onRemoveImage,
}: {
  title: string;
  setTitle: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  amountRef: React.RefObject<HTMLInputElement>;
  category: string;
  setCategory: (v: string) => void;
  paidBy: string;
  setPaidBy: (v: string) => void;
  users: UserDTO[];
  splitEnabled: boolean;
  setSplitEnabled: (v: boolean) => void;
  splitIds: Set<string>;
  setSplitIds: (s: Set<string>) => void;
  dateStr: string;
  setDateStr: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  billImage: string;
  setBillImage: (v: string) => void;
  uploading: boolean;
  onUploadFile: (file: File | null) => void;
  onRemoveImage: () => void;
}) {
  return (
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
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          ref={amountRef}
          id="amount"
          type="number"
          min={1}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl text-2xl font-semibold md:text-3xl"
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-all hover:bg-muted/80",
                category === c
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border bg-card",
              )}
            >
              <span className="text-lg">{CATEGORY_META[c].emoji}</span>
              <span className="leading-tight">{c}</span>
            </button>
          ))}
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
      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-3">
        <div>
          <p className="text-sm font-medium">Split expense (IOU)</p>
          <p className="text-xs text-muted-foreground">
            Off = house expense (wallet only, no balance split)
          </p>
        </div>
        <Checkbox
          checked={splitEnabled}
          onCheckedChange={(c) => setSplitEnabled(c === true)}
          aria-label="Split expense"
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
        </div>
      ) : null}
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
      {category === "Others" ? (
        <div className="space-y-2">
          <Label htmlFor="description">Description (required)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl"
            rows={3}
            placeholder="What was this expense for?"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl"
          rows={2}
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
          <div className="relative mt-2 overflow-hidden rounded-xl border">
            <div className="relative aspect-video max-h-48 w-full bg-muted">
              <Image src={billImage} alt="Bill preview" fill className="object-contain" unoptimized />
            </div>
            <Button type="button" variant="secondary" size="sm" className="m-2 rounded-lg" onClick={onRemoveImage}>
              Remove image
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ExpenseFormDialog({ users, monthKey, expense, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const amountRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Groceries");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  const [dateStr, setDateStr] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [billImage, setBillImage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setSplitEnabled(expense.splitEnabled !== false);
      setSplitIds(new Set(expense.splitBetween));
      setDateStr(expense.date.slice(0, 10));
      setNotes(expense.notes ?? "");
      setDescription(expense.description ?? (expense.category === "Others" ? expense.notes ?? "" : ""));
      setBillImage(expense.billImage ?? "");
    } else if (users.length) {
      setTitle("");
      setAmount("");
      setCategory("Groceries");
      setPaidBy(users[0]._id);
      setSplitEnabled(true);
      setSplitIds(new Set(users.map((u) => u._id)));
      setDateStr(new Date().toISOString().slice(0, 10));
      setNotes("");
      setDescription("");
      setBillImage("");
    }
  }, [expense, open, users]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => amountRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open, expense]);

  const mut = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!title.trim() || !paidBy || !dateStr || !(amt > 0)) {
        throw new Error("Fill title, amount, payer, and date");
      }
      if (category === "Others" && !description.trim()) {
        throw new Error("Description is required for Others");
      }
      if (splitEnabled && splitIds.size === 0) {
        throw new Error("Pick at least one person to split with");
      }
      const payload = {
        title: title.trim(),
        amount: amt,
        category: category as (typeof EXPENSE_CATEGORIES)[number],
        paidBy,
        splitEnabled,
        splitBetween: splitEnabled ? Array.from(splitIds) : [],
        date: new Date(dateStr),
        notes: notes.trim() || undefined,
        description: description.trim() || undefined,
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

  const formProps = {
    title,
    setTitle,
    amount,
    setAmount,
    amountRef,
    category,
    setCategory,
    paidBy,
    setPaidBy,
    users,
    splitEnabled,
    setSplitEnabled,
    splitIds,
    setSplitIds,
    dateStr,
    setDateStr,
    notes,
    setNotes,
    description,
    setDescription,
    billImage,
    setBillImage,
    uploading,
    onUploadFile,
    onRemoveImage: () => setBillImage(""),
  };

  const footer = (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
      <Button
        type="button"
        className="w-full rounded-xl sm:w-auto"
        disabled={mut.isPending || uploading}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save
      </Button>
    </motion.div>
  );

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

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
          </DialogHeader>
          <FormFields {...formProps} />
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[92vh] flex-col rounded-t-2xl p-4">
        <SheetHeader className="text-left">
          <SheetTitle>{expense ? "Edit expense" : "New expense"}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <FormFields {...formProps} />
        </div>
        <div className="border-t pt-4">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
