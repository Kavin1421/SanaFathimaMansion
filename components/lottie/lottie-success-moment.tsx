"use client";

import { LottiePlayer } from "@/components/lottie/lottie-player";
import { getLottieScene, type LottieSceneKey } from "@/lib/lottie-catalog";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  open: boolean;
  onClose?: () => void;
  scene?: LottieSceneKey;
  title: string;
  subtitle?: string;
  amount?: string;
  autoCloseMs?: number;
  action?: Action;
  className?: string;
};

export function LottieSuccessMoment({
  open,
  onClose,
  scene = "expenseAdded",
  title,
  subtitle,
  amount,
  autoCloseMs = 2600,
  action,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const cfg = getLottieScene(scene);

  useEffect(() => {
    if (!open || !onClose || autoCloseMs <= 0) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(t);
  }, [open, onClose, autoCloseMs]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="lottie-success-moment"
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-4",
            className,
          )}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/20 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" aria-hidden />
            <div className="flex flex-col items-center px-6 pb-6 pt-4 text-center">
              <LottiePlayer
                src={cfg.src}
                width={cfg.w + 40}
                height={cfg.h + 40}
                loop={cfg.loop}
                speed={cfg.speed}
                fallbackIcon={cfg.fallback}
                playOnVisible={false}
                ariaLabel={title}
              />
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                {title}
              </p>
              {amount ? (
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {amount}
                </p>
              ) : null}
              {subtitle ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
              {action ? (
                <button
                  type="button"
                  className="mt-5 text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                  onClick={() => {
                    action.onClick();
                    onClose?.();
                  }}
                >
                  {action.label}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
