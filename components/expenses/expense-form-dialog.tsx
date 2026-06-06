"use client";

import { createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { CategoryIcon } from "@/components/icons/category-icon";
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
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { roundMoney } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseDTO, UserDTO } from "@/types";
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
  /** Prefill when creating from a finalized pre-bill */
  preBillSeed?: {
    title: string;
    category: ExpenseCategory;
    notes: string;
    suggestedAmount?: number;
  } | null;
  /** Prefer this payer when opening new expense (e.g. current ledger user) */
  defaultPaidById?: string;
  /** Called after a successful create (not update) */
  onCreated?: (expense: ExpenseDTO) => void;
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
  splitMode,
  setSplitMode,
  customAmounts,
  setCustomAmount,
  onSplitEqually,
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
  splitMode: "equal" | "custom";
  setSplitMode: (v: "equal" | "custom") => void;
  customAmounts: Record<string, string>;
  setCustomAmount: (userId: string, value: string) => void;
  onSplitEqually: () => void;
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
              <CategoryIcon category={c} className="h-5 w-5 text-muted-foreground" />
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
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={splitMode === "equal" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setSplitMode("equal")}
            >
              Equal split
            </Button>
            <Button
              type="button"
              size="sm"
              variant={splitMode === "custom" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setSplitMode("custom")}
            >
              Custom amounts
            </Button>
          </div>
          <Label>Split between</Label>
          <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
            {users.map((u) => (
              <div key={u._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm">
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
                {splitMode === "custom" && splitIds.has(u._id) ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-9 w-full rounded-lg sm:w-28"
                    placeholder="₹"
                    value={customAmounts[u._id] ?? ""}
                    onChange={(e) => setCustomAmount(u._id, e.target.value)}
                  />
                ) : null}
              </div>
            ))}
          </div>
          {splitMode === "custom" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Custom shares must add up to the expense total ({amount ? `₹${amount}` : "enter amount above"}).
              </p>
              <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onSplitEqually}>
                Split equally
              </Button>
            </div>
          ) : null}
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

export function ExpenseFormDialog({
  users,
  monthKey,
  expense,
  open,
  onOpenChange,
  preBillSeed,
  defaultPaidById,
  onCreated,
}: Props) {
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const amountRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Groceries");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [dateStr, setDateStr] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [billImage, setBillImage] = useState("");
  const [uploading, setUploading] = useState(false);

  function setCustomAmount(userId: string, value: string) {
    setCustomAmounts((prev) => ({ ...prev, [userId]: value }));
  }

  function splitEqually() {
    const amt = Number(amount);
    if (!(amt > 0) || splitIds.size === 0) {
      toast.error("Enter amount and pick at least one person");
      return;
    }
    const ids = Array.from(splitIds);
    const share = roundMoney(amt / ids.length);
    let assigned = 0;
    const next: Record<string, string> = {};
    ids.forEach((id, index) => {
      const val = index === ids.length - 1 ? roundMoney(amt - assigned) : share;
      assigned = roundMoney(assigned + val);
      next[id] = String(val);
    });
    setCustomAmounts(next);
  }

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setSplitEnabled(expense.splitEnabled !== false);
      setSplitMode(expense.splitMode === "custom" ? "custom" : "equal");
      setSplitIds(new Set(expense.splitBetween));
      const amounts: Record<string, string> = {};
      for (const row of expense.splitAmounts ?? []) {
        amounts[row.userId] = String(row.amount);
      }
      setCustomAmounts(amounts);
      setDateStr(expense.date.slice(0, 10));
      setNotes(expense.notes ?? "");
      setDescription(expense.description ?? (expense.category === "Others" ? expense.notes ?? "" : ""));
      setBillImage(expense.billImage ?? "");
    } else if (users.length) {
      const payerDefault =
        defaultPaidById && users.some((u) => u._id === defaultPaidById)
          ? defaultPaidById
          : users[0]._id;
      if (preBillSeed) {
        setTitle(preBillSeed.title);
        setAmount(
          preBillSeed.suggestedAmount != null && preBillSeed.suggestedAmount > 0
            ? String(preBillSeed.suggestedAmount)
            : "",
        );
        setCategory(preBillSeed.category);
        setPaidBy(payerDefault);
        setSplitEnabled(true);
        setSplitMode("equal");
        setSplitIds(new Set(users.map((u) => u._id)));
        setCustomAmounts({});
        setDateStr(new Date().toISOString().slice(0, 10));
        setNotes(preBillSeed.notes);
        setDescription(
          preBillSeed.category === "Others"
            ? preBillSeed.notes.split("\n").find((l) => /[A-Za-z]/.test(l))?.slice(0, 500) ??
                preBillSeed.title
            : "",
        );
        setBillImage("");
      } else {
        setTitle("");
        setAmount("");
        setCategory("Groceries");
        setPaidBy(payerDefault);
        setSplitEnabled(true);
        setSplitMode("equal");
        setSplitIds(new Set(users.map((u) => u._id)));
        setCustomAmounts({});
        setDateStr(new Date().toISOString().slice(0, 10));
        setNotes("");
        setDescription("");
        setBillImage("");
      }
    }
  }, [expense, open, users, preBillSeed, defaultPaidById]);

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
      if (description.trim() && !/[A-Za-z]/.test(description.trim())) {
        throw new Error("Description should contain meaningful text, not only numbers/symbols");
      }
      if (splitEnabled && splitIds.size === 0) {
        throw new Error("Pick at least one person to split with");
      }
      let splitAmounts: { userId: string; amount: number }[] | undefined;
      if (splitEnabled && splitMode === "custom") {
        splitAmounts = Array.from(splitIds).map((userId) => ({
          userId,
          amount: Number(customAmounts[userId] ?? 0),
        }));
        const sum = splitAmounts.reduce((s, row) => s + row.amount, 0);
        if (Math.abs(sum - amt) > 0.01) {
          throw new Error("Custom split amounts must add up to the expense total");
        }
      }
      const trimmedBill = billImage.trim();
      const base = {
        title: title.trim(),
        amount: amt,
        category: category as (typeof EXPENSE_CATEGORIES)[number],
        paidBy,
        splitEnabled,
        splitMode: splitEnabled ? splitMode : "equal",
        splitBetween: splitEnabled ? Array.from(splitIds) : [],
        splitAmounts,
        date: new Date(dateStr),
        notes: notes.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (expense) {
        const billImagePayload = trimmedBill.length > 0 ? trimmedBill : null;
        const r = await updateExpenseAction({ id: expense._id, ...base, billImage: billImagePayload });
        if (!r.ok) throw new Error(r.error);
        return r.data;
      }
      const createPayload = {
        ...base,
        ...(trimmedBill.length > 0 ? { billImage: trimmedBill } : {}),
      };
      const r = await createExpenseAction(createPayload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (data) => {
      toast.success(expense ? "Expense updated" : "Expense added");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["activity"] });
      if (!expense && data && onCreated) {
        onCreated(data);
      }
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
    splitMode,
    setSplitMode,
    customAmounts,
    setCustomAmount,
    onSplitEqually: splitEqually,
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
