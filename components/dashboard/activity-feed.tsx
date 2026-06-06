"use client";

import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { ActivityItem } from "@/services/activity";
import { useRefetchIntervalMs } from "@/hooks/use-refetch-interval";
import { useQuery } from "@tanstack/react-query";
import { Handshake, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";

function iconFor(type: ActivityItem["type"]) {
  if (type === "settlement") return Handshake;
  if (type === "pre_bill") return ShoppingCart;
  return Receipt;
}

function labelFor(type: ActivityItem["type"]) {
  if (type === "settlement") return "Settlement";
  if (type === "pre_bill") return "Pre-bill";
  return "Expense";
}

function hrefFor(item: ActivityItem): string {
  const entityId = item.id.replace(/^(expense|settlement|prebill)-/, "");
  if (item.type === "settlement") return "/settlements";
  if (item.type === "pre_bill") return `/pre-bills/${entityId}`;
  const month = item.createdAt.slice(0, 7);
  return `/expenses?month=${encodeURIComponent(month)}`;
}

export function ActivityFeed() {
  const refetchInterval = useRefetchIntervalMs(20_000);
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.activity(15),
    queryFn: async (): Promise<ActivityItem[]> => {
      const r = await fetch("/api/activity?limit=15");
      if (!r.ok) throw new Error("activity");
      return r.json();
    },
    refetchInterval,
  });

  return (
    <section className="dashboard-surface col-span-12 p-5 md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight">Recent activity</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          What’s happening in the household — updates every 20 seconds while this tab is open.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <li key={item.id}>
                <Link
                  href={hrefFor(item)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelFor(item.type)}
                      {item.actorName ? ` · ${item.actorName}` : ""}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                      {" · "}
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {item.amount != null ? (
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatInr(item.amount)}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
