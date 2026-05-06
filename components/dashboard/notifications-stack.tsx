"use client";

import type { MonthlySummary } from "@/types";
import { cn } from "@/lib/utils";
import { BellRing, Info, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";

type Pill = { key: string; icon: LucideIcon; text: string; variant: "warn" | "info" | "action" };

export function NotificationsStack({ summary }: { summary: MonthlySummary }) {
  const pills: Pill[] = [];

  if (summary.insight) {
    const isUp =
      summary.percentChangeVsPrevious !== undefined && summary.percentChangeVsPrevious > 0;
    pills.push({
      key: "insight",
      icon: isUp ? TriangleAlert : Lightbulb,
      text: summary.insight,
      variant: isUp ? "warn" : "info",
    });
  }

  const pct = summary.percentChangeVsPrevious;
  if (pct !== undefined && Math.abs(pct) > 15 && !summary.insight) {
    pills.push({
      key: "swing",
      icon: TriangleAlert,
      text: `Spending shifted ${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs last month.`,
      variant: "warn",
    });
  }

  const rent = summary.categoryBreakdown.find((c) => c.category === "Rent");
  if (rent && summary.totalSpent > 0 && rent.total / summary.totalSpent > 0.4) {
    pills.push({
      key: "rent-share",
      icon: Info,
      text: "Rent is a large share of spending this month.",
      variant: "info",
    });
  }

  if (summary.suggestions.length > 0) {
    pills.push({
      key: "settle",
      icon: BellRing,
      text: `${summary.suggestions.length} settlement${summary.suggestions.length > 1 ? "s" : ""} waiting — settle up below.`,
      variant: "action",
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="col-span-12 flex flex-col gap-2">
      {pills.map((p) => (
        (() => {
          const Icon = p.icon;
          return (
        <div
          key={p.key}
          className={cn(
            "flex items-start gap-3 rounded-full border px-4 py-2.5 text-sm shadow-sm transition-colors",
            p.variant === "warn" &&
              "border-amber-200/80 bg-amber-50/90 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
            p.variant === "info" &&
              "border-slate-200/80 bg-slate-50/90 text-foreground dark:border-slate-800 dark:bg-slate-900/60",
            p.variant === "action" &&
              "border-primary/25 bg-primary/5 text-foreground dark:border-primary/30 dark:bg-primary/10",
          )}
        >
          <span className="shrink-0 leading-none" aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <span className="leading-snug">{p.text}</span>
        </div>
          );
        })()
      ))}
    </div>
  );
}
