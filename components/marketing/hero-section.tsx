"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { HeroDashboardMock } from "@/components/marketing/hero-dashboard-mock";

function GradientMesh({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-[20%] -top-[30%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-gradient-to-br from-indigo-500/35 via-purple-500/25 to-transparent blur-3xl dark:from-indigo-500/30 dark:via-purple-600/25"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 40, 0],
                y: [0, 24, 0],
                scale: [1, 1.06, 1],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[15%] top-[10%] h-[min(80vw,440px)] w-[min(80vw,440px)] rounded-full bg-gradient-to-bl from-purple-500/30 via-fuchsia-500/15 to-transparent blur-3xl dark:from-purple-500/25"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -32, 0],
                y: [0, 36, 0],
                scale: [1, 1.08, 1],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-[25%] h-[min(70vw,380px)] w-[min(70vw,380px)] rounded-full bg-gradient-to-tr from-indigo-400/20 to-cyan-400/10 blur-3xl dark:from-indigo-400/15"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 28, 0],
                y: [0, -20, 0],
                opacity: [0.5, 0.85, 0.5],
              }
        }
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

const ctaPrimaryClass =
  "group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-base font-semibold text-white shadow-[0_10px_40px_rgba(79,70,229,0.4)] transition-shadow duration-300 hover:shadow-[0_14px_52px_rgba(99,102,241,0.55)] dark:shadow-[0_10px_40px_rgba(99,102,241,0.35)] dark:hover:shadow-[0_16px_56px_rgba(129,140,248,0.45)] h-12 md:h-14";

const ctaSecondaryClass =
  "rounded-2xl border border-white/30 bg-white/55 px-8 text-base font-semibold shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 hover:border-indigo-400/40 hover:bg-white/75 hover:shadow-[0_14px_48px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-950/50 dark:hover:bg-slate-900/60 h-12 md:h-14";

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <GradientMesh reduceMotion={reduceMotion} />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 md:grid-cols-2 md:gap-14 md:px-6 md:pb-28 md:pt-20 lg:gap-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.02 }}
            className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Shared expenses, clearer friendships
          </motion.p>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="text-balance text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
          >
            Split bills fairly. Stay organized together.
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground/90 md:text-lg"
          >
            One calm place for rent, groceries, and everything in between — live balances,
            one-tap settlements, and optional Telegram alerts when the ledger moves.
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Button size="lg" asChild className={ctaPrimaryClass}>
                <Link href="/signup" className="flex items-center gap-2">
                  Start your shared home
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Button size="lg" variant="outline" asChild className={ctaSecondaryClass}>
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>
          </motion.div>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-5 text-xs leading-relaxed text-muted-foreground/85"
          >
            After you seed data, open the{" "}
            <Link
              href="/login?intent=demo"
              className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
            >
              demo login
            </Link>{" "}
            — or create a fresh household in seconds.
          </motion.p>
        </motion.div>

        <HeroDashboardMock />
      </div>
    </section>
  );
}
