"use client";

import { settleAction } from "@/app/actions/settlements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { roundMoney } from "@/lib/ledger";
import { formatInr } from "@/lib/utils";
import type { SettlementSuggestion } from "@/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function SettlementConfirmDialog({
  open,
  onOpenChange,
  suggestion,
  balances,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: SettlementSuggestion | null;
  balances: { userId: string; name: string; balance: number }[];
  onSuccess?: () => void;
}) {
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const balanceMap = useMemo(
    () => new Map(balances.map((b) => [b.userId, b.balance])),
    [balances],
  );

  const fromBefore = suggestion ? roundMoney(balanceMap.get(suggestion.fromUserId) ?? 0) : 0;
  const toBefore = suggestion ? roundMoney(balanceMap.get(suggestion.toUserId) ?? 0) : 0;
  const fromAfter = suggestion ? roundMoney(fromBefore + suggestion.amount) : 0;
  const toAfter = suggestion ? roundMoney(toBefore - suggestion.amount) : 0;

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setProofUrl(data.url as string);
      toast.success("Proof uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function confirm() {
    if (!suggestion) return;
    setBusy(true);
    try {
      const r = await settleAction({
        fromUser: suggestion.fromUserId,
        toUser: suggestion.toUserId,
        amount: suggestion.amount,
        date: new Date(),
        proofUrl: proofUrl.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Settlement recorded");
      setNote("");
      setProofUrl("");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setNote("");
          setProofUrl("");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm settlement</DialogTitle>
        </DialogHeader>
        {suggestion ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{suggestion.fromName}</span> pays{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatInr(suggestion.amount)}
              </span>{" "}
              to <span className="font-medium text-foreground">{suggestion.toName}</span>
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {suggestion.fromName}
                </p>
                <p className="mt-2 text-sm tabular-nums">
                  {formatInr(fromBefore)} →{" "}
                  <span className="font-semibold">{formatInr(fromAfter)}</span>
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {suggestion.toName}
                </p>
                <p className="mt-2 text-sm tabular-nums">
                  {formatInr(toBefore)} →{" "}
                  <span className="font-semibold">{formatInr(toAfter)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement-note">Note (optional)</Label>
              <Textarea
                id="settlement-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl"
                rows={2}
                placeholder="UPI ref, cash, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Payment proof (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="rounded-xl"
                disabled={uploading || busy}
                onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
              />
              {proofUrl ? (
                <div className="relative mt-2 overflow-hidden rounded-xl border">
                  <div className="relative aspect-video max-h-40 w-full bg-muted">
                    <Image src={proofUrl} alt="Payment proof" fill className="object-contain" unoptimized />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="m-2 rounded-lg"
                    onClick={() => setProofUrl("")}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" disabled={busy || uploading || !suggestion} onClick={() => void confirm()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
