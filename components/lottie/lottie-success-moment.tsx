"use client";

import { LottiePlayer } from "@/components/lottie/lottie-player";
import { Button } from "@/components/ui/button";
import { getLottieScene, type LottieSceneKey } from "@/lib/lottie-catalog";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

type Action = {
  label: string;
  onClick?: () => void;
};

type Props = {
  open: boolean;
  onClose?: () => void;
  scene?: LottieSceneKey;
  title: string;
  subtitle?: string;
  amount?: string;
  autoCloseMs?: number;
  /** Primary close action, such as Done. */
  primaryAction?: Action;
  /** Secondary action, such as Undo. */
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
  primaryAction,
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
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-16 h-36 w-36 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-2xl"
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" aria-hidden />
            <div className="relative flex flex-col items-center px-6 pb-6 pt-4 text-center">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.05 }}
              >
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
              </motion.div>
              <motion.p
                className="mt-1 text-sm font-medium uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.25 }}
              >
                {title}
              </motion.p>
              {amount ? (
                <motion.p
                  className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground"
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.16 }}
                >
                  {amount}
                </motion.p>
              ) : null}
              {subtitle ? (
                <motion.p
                  className="mt-2 line-clamp-2 text-sm text-muted-foreground"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.25 }}
                >
                  {subtitle}
                </motion.p>
              ) : null}
              {primaryAction || action ? (
                <motion.div
                  className="mt-6 flex w-full flex-col gap-2"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.25 }}
                >
                  {primaryAction ? (
                    <Button
                      type="button"
                      className="h-11 w-full rounded-xl"
                      onClick={() => {
                        primaryAction.onClick?.();
                        onClose?.();
                      }}
                    >
                      {primaryAction.label}
                    </Button>
                  ) : null}
                  {action ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full rounded-xl text-muted-foreground"
                      onClick={() => {
                        action.onClick?.();
                        onClose?.();
                      }}
                    >
                      {action.label}
                    </Button>
                  ) : null}
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
