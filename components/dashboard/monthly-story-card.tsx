"use client";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/icons/category-icon";
import { queryKeys } from "@/lib/query-keys";
import { buildTelegramShareUrl, shareTextNative } from "@/lib/share";
import { formatInr } from "@/lib/utils";
import type { ExpenseCategory, MonthlyStoryDTO } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Share2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function buildStoryText(story: MonthlyStoryDTO): string {
  const lines = [
    `${story.monthLabel} — Household story`,
    `Total spent: ${formatInr(story.totalSpent)}`,
  ];
  if (story.percentChange != null) {
    lines.push(`Vs last month: ${story.percentChange > 0 ? "+" : ""}${Math.round(story.percentChange)}%`);
  }
  if (story.topCategory) {
    lines.push(`Top category: ${story.topCategory.category} (${formatInr(story.topCategory.total)})`);
  }
  if (story.biggestExpense) {
    lines.push(`Biggest: ${story.biggestExpense.title} (${formatInr(story.biggestExpense.amount)})`);
  }
  if (story.topSpender) {
    lines.push(`Top spender: ${story.topSpender.name} (${formatInr(story.topSpender.totalPaid)})`);
  }
  if (story.walletUsedPercent != null) {
    lines.push(`Wallet used: ${Math.round(story.walletUsedPercent)}%`);
  }
  return lines.join("\n");
}

export function MonthlyStoryCard({ monthKey }: { monthKey: string }) {
  const { data: story, isLoading, isError } = useQuery({
    queryKey: queryKeys.monthlyStory(monthKey),
    queryFn: async (): Promise<MonthlyStoryDTO> => {
      const r = await fetch(`/api/dashboard/story?month=${encodeURIComponent(monthKey)}`);
      if (!r.ok) throw new Error("Failed to load monthly story");
      return r.json();
    },
  });

  async function share() {
    if (!story) return;
    const text = buildStoryText(story);
    const ok = await shareTextNative(text, `${story.monthLabel} household story`);
    if (ok) {
      toast.success("Story shared");
      return;
    }
    window.open(buildTelegramShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="dashboard-surface col-span-12 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Monthly story</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Highlights from {story?.monthLabel ?? monthKey}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={!story || isLoading}
          onClick={() => void share()}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading story…
        </div>
      ) : isError || !story ? (
        <p className="mt-6 text-sm text-muted-foreground">Could not load monthly story.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total spent</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(story.totalSpent)}</p>
            {story.percentChange != null ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {story.percentChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {story.percentChange > 0 ? "+" : ""}
                {Math.round(story.percentChange)}% vs last month
              </p>
            ) : null}
          </div>

          {story.topCategory ? (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top category</p>
              <div className="mt-2 flex items-center gap-2">
                <CategoryIcon
                  category={story.topCategory.category as ExpenseCategory}
                  className="h-5 w-5 text-muted-foreground"
                />
                <span className="font-semibold">{story.topCategory.category}</span>
              </div>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {formatInr(story.topCategory.total)}
              </p>
            </div>
          ) : null}

          {story.biggestExpense ? (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Biggest expense</p>
              <p className="mt-1 font-semibold leading-snug">{story.biggestExpense.title}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {formatInr(story.biggestExpense.amount)}
              </p>
            </div>
          ) : null}

          {story.topSpender ? (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top spender</p>
              <p className="mt-1 font-semibold">{story.topSpender.name}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                Paid {formatInr(story.topSpender.totalPaid)}
              </p>
            </div>
          ) : null}

          {story.walletUsedPercent != null ? (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet used</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {Math.round(story.walletUsedPercent)}%
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
