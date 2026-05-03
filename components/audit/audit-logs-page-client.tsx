"use client";

import { AuditLogDetailDialog } from "@/components/audit/audit-log-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_ACTION_TYPES, type AuditActionType } from "@/lib/audit-constants";
import { auditLogSummaryLine, friendlyActionLabel, friendlyTargetType } from "@/lib/audit-log-display";
import { queryKeys } from "@/lib/query-keys";
import type { AuditLogRow } from "@/services/audit-log";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";

function actionBadgeClass(action: AuditActionType): string {
  if (action.startsWith("CREATE") || action === "LOGIN") return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300";
  if (action.startsWith("DELETE")) return "bg-destructive/15 text-destructive";
  if (action.startsWith("UPDATE") || action === "RESET_MONTH" || action === "UPDATE_BUDGET")
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  return "";
}

export function AuditLogsPageClient() {
  const [userId, setUserId] = useState<string>("all");
  const [actionType, setActionType] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<AuditLogRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const limit = 25;

  const filters = useMemo(
    () => ({
      userId: userId === "all" ? undefined : userId,
      actionType: actionType === "all" ? undefined : actionType,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
      page,
      limit,
    }),
    [userId, actionType, from, to, page],
  );

  const { data: performersData } = useQuery({
    queryKey: ["audit-performers"],
    queryFn: async () => {
      const r = await fetch("/api/audit-logs/performers");
      if (!r.ok) throw new Error("performers");
      return r.json() as Promise<{ performers: { accountId: string; email: string; name: string }[] }>;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("limit", String(limit));
      if (filters.userId) p.set("userId", filters.userId);
      if (filters.actionType) p.set("actionType", filters.actionType);
      if (filters.from) p.set("from", filters.from);
      if (filters.to) p.set("to", filters.to);
      const r = await fetch(`/api/audit-logs?${p}`);
      if (r.status === 403) throw new Error("forbidden");
      if (!r.ok) throw new Error("audit");
      return r.json() as Promise<{ rows: AuditLogRow[]; total: number; page: number; limit: number }>;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  function openDetail(row: AuditLogRow) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Audit logs</h2>
        <p className="text-sm text-muted-foreground">
          Who did what, when — open any row for a clear before/after view.
        </p>
      </div>

      <AuditLogDetailDialog row={detailRow} open={detailOpen} onOpenChange={setDetailOpen} />

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Narrow by person, activity, or date range</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5 md:w-56">
            <p className="text-xs font-medium text-muted-foreground">User</p>
            <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All users</SelectItem>
                {(performersData?.performers ?? []).map((p) => (
                  <SelectItem key={p.accountId} value={p.accountId}>
                    {p.name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:min-w-[12rem] md:flex-1 md:max-w-sm">
            <p className="text-xs font-medium text-muted-foreground">Activity</p>
            <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All activities" />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-xl">
                <SelectItem value="all">All activities</SelectItem>
                {AUDIT_ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {friendlyActionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:w-40">
            <p className="text-xs font-medium text-muted-foreground">From</p>
            <Input
              type="date"
              className="rounded-xl"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="space-y-1.5 md:w-40">
            <p className="text-xs font-medium text-muted-foreground">To</p>
            <Input
              type="date"
              className="rounded-xl"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">Could not load audit logs.</p>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {data?.rows.map((row) => (
                  <li key={row._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={`rounded-lg text-xs ${actionBadgeClass(row.actionType)}`}>
                          {friendlyActionLabel(row.actionType)}
                        </Badge>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(new Date(row.createdAt), "MMM d, yyyy · HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{auditLogSummaryLine(row)}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{row.performedBy.name}</span>
                        {" · "}
                        {row.performedBy.email}
                        <span className="mx-1.5 text-border">·</span>
                        <span>{friendlyTargetType(row.targetEntity.type)}</span>
                        {row.targetEntity.label ? (
                          <span className="text-muted-foreground"> — {row.targetEntity.label}</span>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 rounded-xl sm:self-center"
                      onClick={() => openDetail(row)}
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                      View
                    </Button>
                  </li>
                ))}
              </ul>
              {!data?.rows.length ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No entries match your filters.</p>
              ) : null}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {data?.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
