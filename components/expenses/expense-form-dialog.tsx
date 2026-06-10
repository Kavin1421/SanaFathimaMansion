"use client";

import { createExpenseAction, undoExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { ExpenseImpactPreview } from "@/components/expenses/expense-impact-preview";
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
import { MAX_EXPENSE_BILL_IMAGES } from "@/lib/expense-bills";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/currency";
import { resolveInrAmount } from "@/lib/expense-preview";
import { queryKeys } from "@/lib/query-keys";
import { roundMoney } from "@/lib/ledger";
import { showUserError } from "@/lib/show-user-error";
import { cn, formatInr } from "@/lib/utils";
import type { ExpenseCategory, ExpenseDTO, UserDTO } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Current ledger balances for impact preview */
  currentBalances?: Record<string, number>;
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
  billImages,
  uploading,
  currency,
  setCurrency,
  originalAmount,
  setOriginalAmount,
  onUploadFiles,
  onRemoveImage,
}: {
  title: string;
  setTitle: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: SupportedCurrency;
  setCurrency: (v: SupportedCurrency) => void;
  originalAmount: string;
  setOriginalAmount: (v: string) => void;
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
  billImages: string[];
  uploading: boolean;
  onUploadFiles: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
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
        <Label>Currency</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as SupportedCurrency)}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {SUPPORTED_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currency === "INR" ? (
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
      ) : (
        <div className="space-y-2">
          <Label htmlFor="original-amount">Original amount ({currency})</Label>
          <Input
            ref={amountRef}
            id="original-amount"
            type="number"
            min={0.01}
            step="0.01"
            value={originalAmount}
            onChange={(e) => setOriginalAmount(e.target.value)}
            className="rounded-xl text-2xl font-semibold md:text-3xl"
          />
          {originalAmount && Number(originalAmount) > 0 ? (
            <p className="text-xs text-muted-foreground">
              ≈ {formatInr(resolveInrAmount({ amount: 0, paidBy: "", splitEnabled: true, splitMode: "equal", splitBetween: [], currency, originalAmount: Number(originalAmount) }))}
            </p>
          ) : null}
        </div>
      )}
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
        <Label>Bill images (up to {MAX_EXPENSE_BILL_IMAGES})</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          className="rounded-xl"
          disabled={uploading || billImages.length >= MAX_EXPENSE_BILL_IMAGES}
          onChange={(e) => {
            onUploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          {billImages.length}/{MAX_EXPENSE_BILL_IMAGES} selected
          {billImages.length < MAX_EXPENSE_BILL_IMAGES ? " — pick one or more photos" : ""}
        </p>
        {billImages.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {billImages.map((src, index) => (
              <div key={`${src}-${index}`} className="overflow-hidden rounded-xl border">
                <div className="relative aspect-video max-h-40 w-full bg-muted">
                  <Image src={src} alt={`Bill ${index + 1}`} fill className="object-contain" unoptimized />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="m-2 rounded-lg"
                  onClick={() => onRemoveImage(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
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
  currentBalances: currentBalancesProp,
}: Props) {
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const amountRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("INR");
  const [originalAmount, setOriginalAmount] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fetchedBalances, setFetchedBalances] = useState<Record<string, number>>({});
  const [previewBalances, setPreviewBalances] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string>("Groceries");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [dateStr, setDateStr] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [billImages, setBillImages] = useState<string[]>([]);
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
      setBillImages(
        expense.billImages?.length
          ? expense.billImages
          : expense.billImage
            ? [expense.billImage]
            : [],
      );
      setCurrency((expense.currency as SupportedCurrency) ?? "INR");
      setOriginalAmount(expense.originalAmount != null ? String(expense.originalAmount) : "");
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
        setBillImages([]);
        setCurrency("INR");
        setOriginalAmount("");
      } else {
        setTitle("");
        setAmount("");
        setCurrency("INR");
        setOriginalAmount("");
        setCategory("Groceries");
        setPaidBy(payerDefault);
        setSplitEnabled(true);
        setSplitMode("equal");
        setSplitIds(new Set(users.map((u) => u._id)));
        setCustomAmounts({});
        setDateStr(new Date().toISOString().slice(0, 10));
        setNotes("");
        setDescription("");
        setBillImages([]);
      }
    }
  }, [expense, open, users, preBillSeed, defaultPaidById]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => amountRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open, expense]);

  const userNames = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u.name])),
    [users],
  );

  function buildPreviewInput() {
    const inrAmt = currency === "INR" ? Number(amount) : resolveInrAmount({
      amount: 0,
      paidBy,
      splitEnabled,
      splitMode,
      splitBetween: Array.from(splitIds),
      currency,
      originalAmount: Number(originalAmount),
    });
    let splitAmounts: { userId: string; amount: number }[] | undefined;
    if (splitEnabled && splitMode === "custom") {
      splitAmounts = Array.from(splitIds).map((userId) => ({
        userId,
        amount: Number(customAmounts[userId] ?? 0),
      }));
    }
    return {
      amount: inrAmt,
      paidBy,
      splitEnabled,
      splitMode,
      splitBetween: Array.from(splitIds),
      splitAmounts,
      currency,
      originalAmount: currency !== "INR" ? Number(originalAmount) : undefined,
    };
  }

  function validateForm(): string | null {
    const inrAmt =
      currency === "INR"
        ? Number(amount)
        : resolveInrAmount({
            amount: 0,
            paidBy,
            splitEnabled,
            splitMode,
            splitBetween: Array.from(splitIds),
            currency,
            originalAmount: Number(originalAmount),
          });
    if (!title.trim() || !paidBy || !dateStr || !(inrAmt > 0)) {
      return "Fill title, amount, payer, and date";
    }
    if (category === "Others" && !description.trim()) {
      return "Description is required for Others";
    }
    if (description.trim() && !/[A-Za-z]/.test(description.trim())) {
      return "Description should contain meaningful text, not only numbers/symbols";
    }
    if (splitEnabled && splitIds.size === 0) {
      return "Pick at least one person to split with";
    }
    if (splitEnabled && splitMode === "custom") {
      const splitAmounts = Array.from(splitIds).map((userId) => ({
        userId,
        amount: Number(customAmounts[userId] ?? 0),
      }));
      const sum = splitAmounts.reduce((s, row) => s + row.amount, 0);
      if (Math.abs(sum - inrAmt) > 0.01) {
        return "Custom split amounts must add up to the expense total";
      }
    }
    return null;
  }

  async function openPreview() {
    const err = validateForm();
    if (err) {
      showUserError(err, "expense");
      return;
    }
    let balances = currentBalancesProp ?? fetchedBalances;
    if (Object.keys(balances).length === 0) {
      try {
        const res = await fetch(`/api/dashboard?month=${encodeURIComponent(monthKey)}`);
        if (res.ok) {
          const dash = await res.json();
          balances = Object.fromEntries(
            dash.balances.map((b: { userId: string; balance: number }) => [b.userId, b.balance]),
          );
          setFetchedBalances(balances);
        }
      } catch {
        /* preview still works with empty balances */
      }
    }
    setPreviewBalances(balances);
    setPreviewOpen(true);
  }

  const mut = useMutation({
    mutationFn: async () => {
      const err = validateForm();
      if (err) throw new Error(err);
      const inrAmt =
        currency === "INR"
          ? Number(amount)
          : resolveInrAmount({
              amount: 0,
              paidBy,
              splitEnabled,
              splitMode,
              splitBetween: Array.from(splitIds),
              currency,
              originalAmount: Number(originalAmount),
            });
      const amt = inrAmt;
      let splitAmounts: { userId: string; amount: number }[] | undefined;
      if (splitEnabled && splitMode === "custom") {
        splitAmounts = Array.from(splitIds).map((userId) => ({
          userId,
          amount: Number(customAmounts[userId] ?? 0),
        }));
      }
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
        ...(currency !== "INR" ? { currency, originalAmount: Number(originalAmount) } : {}),
      };
      const billImagesPayload = billImages.length > 0 ? billImages : null;
      if (expense) {
        const r = await updateExpenseAction({ id: expense._id, ...base, billImages: billImagesPayload });
        if (!r.ok) throw new Error(r.error);
        return r.data;
      }
      const createPayload = {
        ...base,
        ...(billImages.length > 0 ? { billImages } : {}),
      };
      const r = await createExpenseAction(createPayload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (data) => {
      setPreviewOpen(false);
      if (expense) {
        toast.success("Expense updated");
      } else {
        toast.success("Expense added", {
          duration: 5 * 60 * 1000,
          action: data
            ? {
                label: "Undo",
                onClick: () => {
                  void undoExpenseAction(data._id).then((r) => {
                    if (r.ok) {
                      toast.success("Expense undone");
                      qc.invalidateQueries({ queryKey: ["expenses"] });
                      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
                      qc.invalidateQueries({ queryKey: ["activity"] });
                    } else {
                      showUserError(r.error, "expense");
                    }
                  });
                },
              }
            : undefined,
        });
      }
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["activity"] });
      if (!expense && data && onCreated) {
        onCreated(data);
      }
      onOpenChange(false);
    },
    onError: (e: Error) => showUserError(e, "expense"),
  });

  async function onUploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_EXPENSE_BILL_IMAGES - billImages.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_EXPENSE_BILL_IMAGES} bill images allowed`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length < files.length) {
      toast.message(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added`);
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        urls.push(data.url as string);
      }
      setBillImages((prev) => [...prev, ...urls].slice(0, MAX_EXPENSE_BILL_IMAGES));
      toast.success(urls.length === 1 ? "Image uploaded" : `${urls.length} images uploaded`);
    } catch (e) {
      showUserError(e, "upload");
    } finally {
      setUploading(false);
    }
  }

  const formProps = {
    title,
    setTitle,
    amount,
    setAmount,
    currency,
    setCurrency,
    originalAmount,
    setOriginalAmount,
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
    billImages,
    uploading,
    onUploadFiles,
    onRemoveImage: (index: number) => setBillImages((prev) => prev.filter((_, i) => i !== index)),
  };

  const footer = (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
      <Button
        type="button"
        className="w-full rounded-xl sm:w-auto"
        disabled={mut.isPending || uploading}
        onClick={() => void openPreview()}
      >
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Review & save
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

  const previewDialog = (
    <ExpenseImpactPreview
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      input={previewOpen ? buildPreviewInput() : null}
      userNames={userNames}
      currentBalances={currentBalancesProp ?? previewBalances}
      busy={mut.isPending}
      onConfirm={() => mut.mutate()}
    />
  );

  if (desktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
            </DialogHeader>
            <FormFields {...formProps} />
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
        {previewDialog}
      </>
    );
  }

  return (
    <>
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
      {previewDialog}
    </>
  );
}
