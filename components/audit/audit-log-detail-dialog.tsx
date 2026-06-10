"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { friendlyActionLabel, friendlyTargetType } from "@/lib/audit-log-display";
import type { AuditActionType } from "@/lib/audit-constants";
import type { AuditLogRow } from "@/services/audit-log";
import { formatInr } from "@/lib/utils";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

function actionBadgeClass(action: AuditActionType): string {
  if (action.startsWith("CREATE") || action === "LOGIN") return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300";
  if (action.startsWith("DELETE")) return "bg-destructive/15 text-destructive";
  if (action.startsWith("UPDATE") || action === "RESET_MONTH" || action === "UPDATE_BUDGET")
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  return "";
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function PayloadFields({ data, title }: { data: Record<string, unknown> | null; title: string }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  const titleVal = data.title;
  const amountVal = data.amount;
  const isExpenseLike = typeof titleVal === "string" && typeof amountVal === "number";

  if (isExpenseLike) {
    const rows: { k: string; v: ReactNode }[] = [
      { k: "Title", v: String(titleVal) },
      { k: "Amount", v: formatInr(amountVal) },
    ];
    if (typeof data.category === "string") rows.push({ k: "Category", v: data.category });
    if (typeof data.date === "string") rows.push({ k: "Date", v: data.date });
    if (typeof data.notes === "string" && data.notes.trim()) rows.push({ k: "Notes", v: data.notes });
    const billUrls = Array.isArray(data.billImages)
      ? data.billImages.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : typeof data.billImage === "string" && data.billImage.trim()
        ? [data.billImage.trim()]
        : [];
    if (billUrls.length > 0) {
      rows.push({
        k: billUrls.length > 1 ? "Bill images" : "Bill image",
        v: (
          <span className="flex flex-col gap-1">
            {billUrls.map((url, i) =>
              isHttpUrl(url) ? (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                >
                  {billUrls.length > 1 ? `Receipt ${i + 1}` : "Open link"}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : (
                <span key={`${url}-${i}`}>{url}</span>
              ),
            )}
          </span>
        ),
      });
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <dl className="grid gap-2 rounded-xl border bg-card p-3 text-sm">
          {rows.map(({ k, v }) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const pretty = JSON.stringify(data, null, 2);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <pre className="max-h-[min(50vh,22rem)] overflow-auto rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed">
        {pretty}
      </pre>
    </div>
  );
}

type Props = {
  row: AuditLogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuditLogDetailDialog({ row, open, onOpenChange }: Props) {
  if (!row) return null;

  const when = format(new Date(row.createdAt), "MMM d, yyyy · HH:mm");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={`rounded-lg text-xs ${actionBadgeClass(row.actionType)}`}>
              {friendlyActionLabel(row.actionType)}
            </Badge>
            <span className="text-xs text-muted-foreground">{when}</span>
          </div>
          <DialogTitle className="text-lg leading-snug">
            {friendlyTargetType(row.targetEntity.type)}
            {row.targetEntity.label ? (
              <span className="mt-1 block font-normal text-muted-foreground">{row.targetEntity.label}</span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-left text-sm">
            <span className="font-medium text-foreground">{row.performedBy.name}</span>
            <span className="text-muted-foreground"> · {row.performedBy.email}</span>
            {row.targetEntity.id ? (
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">ID: {row.targetEntity.id}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <PayloadFields data={row.previousValue} title="Before" />
          <PayloadFields data={row.newValue} title="After" />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
