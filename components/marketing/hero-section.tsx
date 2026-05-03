"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 md:grid-cols-2 md:px-6 md:pb-24 md:pt-16 lg:gap-16">
      <div className="flex flex-col justify-center">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-sm font-medium uppercase tracking-widest text-primary"
        >
          Shared expenses, clearer friendships
        </motion.p>
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
        >
          Split bills fairly. Stay organized together.
        </motion.h1>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
        >
          One calm place for rent, groceries, and everything in between — with balances,
          settlements, and optional WhatsApp nudges when something changes.
        </motion.p>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Button size="lg" asChild className="gap-2 rounded-xl shadow-lg shadow-primary/20">
            <Link href="/signup">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="gap-2 rounded-xl bg-white/50 backdrop-blur-md dark:bg-slate-950/50">
            <a href="#dashboard-preview">
              <Play className="h-4 w-4" />
              View demo
            </a>
          </Button>
        </motion.div>
        <p className="mt-4 text-xs text-muted-foreground">
          After you seed data, open the{" "}
          <Link href="/login?intent=demo" className="font-medium text-primary underline-offset-4 hover:underline">
            demo login
          </Link>{" "}
          — or create a fresh household in seconds.
        </p>
      </div>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.12 }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-primary/5 blur-2xl" />
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            This month
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">₹24,420</p>
          <p className="text-sm text-muted-foreground">Total shared spend · mock preview</p>
          <div className="mt-6 flex h-28 items-end gap-1.5">
            {[40, 72, 48, 88, 56, 96, 64].map((h, i) => (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.55, delay: 0.15 + i * 0.05 }}
                className="flex-1 origin-bottom rounded-t-md bg-primary/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
