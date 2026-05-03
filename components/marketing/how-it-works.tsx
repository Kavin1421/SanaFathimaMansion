"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightLeft, Receipt, Wallet } from "lucide-react";

const steps = [
  {
    icon: Receipt,
    title: "Add expenses",
    text: "Log rent, groceries, and bills in seconds — who paid and who shares stays crystal clear.",
  },
  {
    icon: ArrowRightLeft,
    title: "Split automatically",
    text: "Fair shares roll up into live balances so nobody has to do spreadsheet math at midnight.",
  },
  {
    icon: Wallet,
    title: "Settle instantly",
    text: "Record a transfer, close the loop, and move on — with optional nudges when things change.",
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-20 md:px-6 md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-transparent to-purple-500/[0.06] dark:from-indigo-500/10 dark:to-purple-600/10" />
      <motion.h2
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center text-3xl font-bold tracking-tight md:text-4xl"
      >
        How it works
      </motion.h2>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mx-auto mt-3 max-w-xl text-center text-muted-foreground"
      >
        Three calm steps from chaos to clarity — designed for real flats, not corporate finance.
      </motion.p>
      <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 * i }}
            className="group relative rounded-3xl border border-white/20 bg-white/50 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="absolute -right-px -top-px h-24 w-24 rounded-bl-[4rem] rounded-tr-3xl bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-indigo-400/15" />
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_24px_rgba(99,102,241,0.45)] dark:shadow-[0_8px_28px_rgba(129,140,248,0.4)]">
              <step.icon className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600/90 dark:text-indigo-400">
              Step {i + 1}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
