"use client";

import { LottiePlayer } from "@/components/lottie/lottie-player";
import { getLottieScene } from "@/lib/lottie-catalog";
import { Label } from "@/components/ui/label";
import { preBillShoppingStats } from "@/lib/pre-bill-utils";
import type { PreBillItemDTO } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useMemo } from "react";

export function PreBillShoppingProgress({
  items,
  showPendingOnly,
  onShowPendingOnlyChange,
  filterId = "pb-pending-only",
  extra,
}: {
  items: PreBillItemDTO[];
  showPendingOnly: boolean;
  onShowPendingOnlyChange: (value: boolean) => void;
  /** Unique id when multiple instances on page */
  filterId?: string;
  extra?: ReactNode;
}) {
  const { total, purchased, allPurchased } = useMemo(() => preBillShoppingStats(items), [items]);
  const pct = total > 0 ? Math.round((purchased / total) * 100) : 0;
  const doneScene = getLottieScene("shoppingDone");

  return (
    <div className="space-y-4">
      {extra}
      {total > 0 ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{purchased}</span>
              <span className="text-muted-foreground"> of </span>
              <span className="tabular-nums">{total}</span>
              <span className="text-muted-foreground"> items purchased</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                id={filterId}
                type="checkbox"
                checked={showPendingOnly}
                onChange={(e) => onShowPendingOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor={filterId} className="cursor-pointer text-sm font-normal text-muted-foreground">
                Show only pending
              </Label>
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-600"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </>
      ) : null}

      <AnimatePresence>
        {allPurchased && total > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <LottiePlayer
              src={doneScene.src}
              width={doneScene.w}
              height={doneScene.h}
              loop={doneScene.loop}
              speed={doneScene.speed}
              fallbackIcon={doneScene.fallback}
              playOnVisible={false}
              ariaLabel="All items purchased"
            />
            <p className="text-sm font-medium">
              <span className="mr-1.5" aria-hidden>
                🎉
              </span>
              All items purchased!
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
