"use client";

import {
  finalizePreBillAction,
  notifyFinalizedPreBillTelegramAction,
  updateFinalizedPreBillAction,
  updatePreBillAction,
} from "@/app/actions/pre-bills";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { PreBillDTO, PreBillItemDTO } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PreBillItemRow } from "./pre-bill-item-row";

function formatPreviewLine(item: PreBillItemDTO): string {
  const qty =
    item.quantity % 1 === 0 ? String(item.quantity) : String(item.quantity);
  const qtyUnit = item.unit === "pcs" ? `${qty} ${item.unit}` : `${qty}${item.unit}`;
  return `${item.name.trim() || "…"} - ${qtyUnit}`;
}

/** Same shape as persisted payload — empty-name rows are omitted (draft-only UI rows). */
function sanitizeItemsForSave(items: PreBillItemDTO[]): PreBillItemDTO[] {
  return items
    .map((i) => ({
      name: i.name.trim(),
      quantity: i.quantity,
      unit: i.unit,
      ...(typeof i.price === "number" && i.price >= 0 ? { price: i.price } : {}),
    }))
    .filter((i) => i.name.length > 0 && i.quantity > 0);
}

function buildPayloadSnapshot(
  title: string,
  category: PreBillDTO["category"],
  notes: string | undefined,
  items: PreBillItemDTO[],
): string {
  return JSON.stringify({
    title: title.trim(),
    category,
    notes: (notes ?? "").trim(),
    items: sanitizeItemsForSave(items),
  });
}

export function PreBillEditor({
  preBill,
  onUpdated,
}: {
  preBill: PreBillDTO;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(preBill.title);
  const [category, setCategory] = useState(preBill.category);
  const [notes, setNotes] = useState(preBill.notes ?? "");
  const [items, setItems] = useState<PreBillItemDTO[]>(
    preBill.items.length > 0
      ? preBill.items
      : [{ name: "", quantity: 1, unit: "pcs" }],
  );
  const [itemSearch, setItemSearch] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [telegramSending, setTelegramSending] = useState(false);

  const isDraft = preBill.status === "draft";

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string>("");

  // Only sync from the server when opening a different pre-bill. Do not depend on
  // `updatedAt` — after each autosave, refetch updates the parent and would reset
  // local rows, wiping in-progress empty "Add item" rows (they are not persisted).
  useEffect(() => {
    const rowItems: PreBillItemDTO[] =
      preBill.items.length > 0
        ? preBill.items
        : [{ name: "", quantity: 1, unit: "pcs" }];
    setTitle(preBill.title);
    setCategory(preBill.category);
    setNotes(preBill.notes ?? "");
    setItems(rowItems);
    lastSyncedRef.current = buildPayloadSnapshot(
      preBill.title,
      preBill.category,
      preBill.notes,
      rowItems,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching documents; see comment above
  }, [preBill._id]);

  const sanitizedItems = useMemo(() => sanitizeItemsForSave(items), [items]);

  const payloadSnapshot = useMemo(
    () => buildPayloadSnapshot(title, category, notes, items),
    [title, category, notes, items],
  );

  const saveDraft = useCallback(async () => {
    if (payloadSnapshot === lastSyncedRef.current) return;
    if (!(isDraft || preBill.status === "finalized")) return;

    setSaveState("saving");
    const payload = {
      id: preBill._id,
      title: title.trim() || "Shopping list",
      category,
      notes: notes.trim() || undefined,
      items: sanitizedItems,
    };
    const r = isDraft
      ? await updatePreBillAction(payload)
      : await updateFinalizedPreBillAction(payload);
    if (!r.ok) {
      setSaveState("idle");
      toast.error(r.error);
      return;
    }
    lastSyncedRef.current = payloadSnapshot;
    setSaveState("saved");
    onUpdated();
    setTimeout(() => setSaveState("idle"), 1500);
  }, [
    preBill._id,
    preBill.status,
    isDraft,
    title,
    category,
    notes,
    sanitizedItems,
    payloadSnapshot,
    onUpdated,
  ]);

  useEffect(() => {
    if (!(isDraft || preBill.status === "finalized")) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void saveDraft();
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [payloadSnapshot, isDraft, preBill.status, saveDraft]);

  async function pushTelegram() {
    setTelegramSending(true);
    const r = await notifyFinalizedPreBillTelegramAction({ id: preBill._id });
    setTelegramSending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Latest list sent to Telegram");
  }

  const filteredIndexes = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items.map((_, i) => i);
    return items.map((it, i) => (it.name.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0);
  }, [items, itemSearch]);

  function updateItem(index: number, next: PreBillItemDTO) {
    setItems((prev) => prev.map((it, i) => (i === index ? next : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unit: "pcs" }]);
  }

  async function runFinalize() {
    if (sanitizedItems.length < 1) {
      toast.error("Add at least one item with a name and quantity");
      setFinalizeOpen(false);
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      setFinalizeOpen(false);
      return;
    }
    setFinalizing(true);
    const saved = await updatePreBillAction({
      id: preBill._id,
      title: title.trim(),
      category,
      notes: notes.trim() || undefined,
      items: sanitizedItems,
    });
    if (!saved.ok) {
      setFinalizing(false);
      toast.error(saved.error);
      return;
    }
    lastSyncedRef.current = payloadSnapshot;
    const r = await finalizePreBillAction({ id: preBill._id });
    setFinalizing(false);
    setFinalizeOpen(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Pre-bill finalized — Telegram notified");
    onUpdated();
  }

  const previewLines = sanitizedItems.map(formatPreviewLine);

  return (
    <div className="space-y-6 pb-28">
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
          {!isDraft ? (
            <p className="text-sm font-normal text-muted-foreground">
              This pre-bill is finalized — you can still change title, category, notes, and line items.
              Edits save automatically; tap <strong>Send to Telegram</strong> when you want to ping the
              group with the current list.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="pb-title">Title</Label>
            <Input
              id="pb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
              placeholder="May D-Mart shopping"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pb-notes">Notes</Label>
            <Textarea
              id="pb-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[88px] rounded-xl"
              placeholder="Optional context…"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-md transition-shadow duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Items</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl transition-transform active:scale-[0.98]"
            onClick={addItem}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pb-item-search">Search items</Label>
            <Input
              id="pb-item-search"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Filter rows…"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {(itemSearch.trim() ? filteredIndexes : items.map((_, i) => i)).map((idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <PreBillItemRow
                    index={idx}
                    item={items[idx]!}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-muted/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          {previewLines.length ? (
            <ul className="space-y-1 text-sm">
              {previewLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Add items to see preview</p>
          )}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && "Saved"}
            {saveState === "idle" && isDraft && "Changes save automatically"}
            {saveState === "idle" && !isDraft && "Edits save automatically · Telegram only when you send"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!isDraft && preBill.status === "finalized" ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl transition-transform active:scale-[0.98]"
                disabled={telegramSending || !title.trim() || sanitizedItems.length < 1}
                onClick={() => void pushTelegram()}
              >
                {telegramSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send to Telegram
              </Button>
            ) : null}
            {isDraft ? (
              <Button
                type="button"
                className="rounded-xl transition-transform active:scale-[0.98]"
                disabled={finalizing || !title.trim() || sanitizedItems.length < 1}
                onClick={() => setFinalizeOpen(true)}
              >
                {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Finalize
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this pre-bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the list as finalized and sends an initial Telegram notification. You can still
              edit it later from this page; use &quot;Send to Telegram&quot; after changes to update the
              group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={finalizing}>
              Cancel
            </AlertDialogCancel>
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={finalizing}
              onClick={() => void runFinalize()}
            >
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finalize & notify
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
