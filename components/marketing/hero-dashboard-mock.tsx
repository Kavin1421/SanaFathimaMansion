"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import CountUp from "react-countup";
import { useEffect, useRef, useState } from "react";

const BAR_HEIGHTS = [38, 62, 44, 78, 52, 88, 58, 72];

function BackCard({
  className,
  delay,
  reduceMotion,
}: {
  className: string;
  delay: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      className={className}
    />
  );
}

export function HeroDashboardMock() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [showCount, setShowCount] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springMx = useSpring(mx, { stiffness: 120, damping: 18 });
  const springMy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(springMx, [-0.5, 0.5], [6, -6]);
  const rotateX = useTransform(springMy, [-0.5, 0.5], [-5, 5]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setShowCount(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px);
    my.set(py);
  }

  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      className="relative mx-auto flex min-h-[420px] w-full max-w-lg items-center justify-center py-6 md:min-h-[480px]"
      style={{ perspective: 1200 }}
    >
      <BackCard
        reduceMotion={reduceMotion}
        delay={0.05}
        className="absolute left-[8%] top-[18%] z-0 h-48 w-[72%] rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/25 to-purple-600/20 shadow-[0_10px_40px_rgba(0,0,0,0.12)] blur-[2px] dark:border-white/5 dark:from-indigo-500/15 dark:to-purple-600/10 dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      />
      <BackCard
        reduceMotion={reduceMotion}
        delay={0.12}
        className="absolute right-[6%] top-[10%] z-0 h-40 w-[65%] rounded-3xl border border-white/10 bg-white/40 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-900/40 dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
      />
      <BackCard
        reduceMotion={reduceMotion}
        delay={0.18}
        className="absolute bottom-[14%] left-[12%] z-0 h-36 w-[58%] rounded-3xl border border-indigo-300/20 bg-gradient-to-tr from-purple-500/20 to-indigo-400/15 blur-[3px] dark:border-indigo-500/20"
      />

      <motion.div
        ref={ref}
        style={{
          rotateX: reduceMotion ? 0 : rotateX,
          rotateY: reduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md cursor-default rounded-3xl border border-white/25 bg-white/65 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_10px_40px_rgba(0,0,0,0.45),0_0_60px_-12px_rgba(99,102,241,0.35)] md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              This month
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight md:text-[2.75rem]">
              {showCount && !reduceMotion ? (
                <CountUp end={24420} duration={2.2} prefix="₹" separator="," />
              ) : (
                "₹24,420"
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/90">Total shared spend</p>
          </div>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm dark:text-indigo-300">
            Live mock
          </span>
        </div>

        <div className="mt-8 flex h-32 items-end gap-1.5 rounded-2xl bg-gradient-to-t from-indigo-500/5 to-transparent px-2 pb-2 pt-6 dark:from-indigo-500/10">
          {BAR_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: 0.65,
                delay: 0.35 + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-indigo-600 to-purple-500 shadow-[0_4px_14px_rgba(99,102,241,0.35)] dark:shadow-[0_4px_18px_rgba(129,140,248,0.4)]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/20 bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Settled
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              94%
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/50 p-3 dark:border-white/10 dark:bg-slate-900/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Members
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">4</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
