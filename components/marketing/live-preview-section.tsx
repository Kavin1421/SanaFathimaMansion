"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";

export function LivePreviewSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="live-preview"
      className="relative scroll-mt-20 border-y border-white/10 py-16 dark:border-white/5 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50/80 via-indigo-50/30 to-purple-50/40 dark:from-slate-950 dark:via-[hsl(229_40%_8%)] dark:to-[hsl(262_35%_10%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[480px] w-[min(100%,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/20" />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Live preview
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            The moment everyone understands the balance
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            No spreadsheets. No awkward texts. Just a single line that makes the household feel
            fair.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="relative mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/25 bg-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-3 dark:bg-slate-900/50">
            <span className="h-3 w-3 rounded-full bg-red-400/90" />
            <span className="h-3 w-3 rounded-full bg-amber-400/90" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
            <span className="ml-3 text-xs text-muted-foreground">dashboard — April</span>
          </div>

          <div className="grid gap-0 md:grid-cols-[1fr_320px]">
            <div className="space-y-4 p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Household spend</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">₹51,200</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  +12% vs last month
                </div>
              </div>
              <div className="flex h-36 items-end gap-2 rounded-2xl border border-white/15 bg-gradient-to-t from-indigo-500/10 to-transparent p-4 dark:border-white/10">
                {[35, 55, 42, 70, 48, 82, 60, 90, 52].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={reduceMotion ? false : { scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 origin-bottom rounded-t-sm bg-gradient-to-t from-indigo-600 to-purple-500 opacity-90"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Rent", "Groceries", "Utilities"].map((label, i) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/15 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <p className="text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      ₹{[24000, 12400, 4800][i].toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 md:border-l md:border-t-0 dark:from-indigo-500/15 dark:via-purple-600/10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Balances
              </p>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-4 rounded-2xl border-2 border-indigo-500/40 bg-white/80 p-5 shadow-[0_0_40px_-8px_rgba(99,102,241,0.5)] dark:border-indigo-400/50 dark:bg-slate-900/80 dark:shadow-[0_0_48px_-8px_rgba(129,140,248,0.45)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    Core insight
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold leading-snug tracking-tight md:text-xl">
                  <span className="text-foreground">Dinesh</span>{" "}
                  <span className="font-normal text-muted-foreground">owes</span>{" "}
                  <span className="text-foreground">Kevin</span>
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                  ₹500
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 shrink-0 text-indigo-500" />
                  Settle in one tap when you&apos;re ready
                </div>
              </motion.div>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex justify-between border-b border-border/40 pb-2">
                  <span>Fathima</span>
                  <span className="font-medium text-foreground">+₹1,240</span>
                </li>
                <li className="flex justify-between border-b border-border/40 pb-2">
                  <span>Arun</span>
                  <span className="font-medium text-foreground">−₹620</span>
                </li>
                <li className="flex justify-between">
                  <span>Dilip</span>
                  <span className="font-medium text-foreground">even</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
