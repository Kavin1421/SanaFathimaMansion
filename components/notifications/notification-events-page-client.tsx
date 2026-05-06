"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";
import type { NotificationEventRow } from "@/services/notification-events";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";

function statusClass(status: "sent" | "failed" | "skipped"): string {
  if (status === "sent") return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300";
  if (status === "failed") return "bg-destructive/15 text-destructive";
  return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
}

export function NotificationEventsPageClient() {
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const filters = useMemo(
    () => ({
      channel: channel === "all" ? undefined : channel,
      status: status === "all" ? undefined : status,
      eventType: eventType.trim() || undefined,
      search: search.trim() || undefined,
      page,
      limit,
    }),
    [channel, status, eventType, search, page],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notificationEvents(filters),
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("limit", String(limit));
      if (filters.channel) p.set("channel", filters.channel);
      if (filters.status) p.set("status", filters.status);
      if (filters.eventType) p.set("eventType", filters.eventType);
      if (filters.search) p.set("search", filters.search);
      const r = await fetch(`/api/notification-events?${p}`);
      if (r.status === 403) throw new Error("forbidden");
      if (!r.ok) throw new Error("events");
      return r.json() as Promise<{ rows: NotificationEventRow[]; total: number; page: number; limit: number }>;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notification events</h2>
        <p className="text-sm text-muted-foreground">Delivery status for email and WhatsApp sends.</p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter by channel, status, event type, or recipient/message search.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5 md:w-44">
            <p className="text-xs font-medium text-muted-foreground">Channel</p>
            <Select value={channel} onValueChange={(v) => { setChannel(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="All channels" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:w-44">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:w-60">
            <p className="text-xs font-medium text-muted-foreground">Event type</p>
            <Input className="rounded-xl" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} placeholder="invite_email" />
          </div>
          <div className="space-y-1.5 md:flex-1">
            <p className="text-xs font-medium text-muted-foreground">Search</p>
            <Input className="rounded-xl" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="recipient or error message" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">Could not load notification events.</p>
          ) : isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (
            <>
              <ul className="divide-y">
                {data?.rows.map((row) => (
                  <li key={row._id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={`rounded-lg text-xs ${statusClass(row.status)}`}>{row.status}</Badge>
                      <Badge variant="outline" className="rounded-lg text-xs">{row.channel}</Badge>
                      <span className="text-xs text-muted-foreground">{row.eventType}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{format(new Date(row.createdAt), "MMM d, yyyy · HH:mm")}</span>
                    </div>
                    <p className="text-sm">{row.recipient || "No recipient"}</p>
                    {row.message ? <p className="text-xs text-muted-foreground">{row.message}</p> : null}
                  </li>
                ))}
              </ul>
              {!data?.rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No events match your filters.</p> : null}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {data?.total ?? 0} total</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
