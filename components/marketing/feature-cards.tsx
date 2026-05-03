"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, PieChart, Receipt, Users } from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Expense ledger",
    body: "Capture who paid, how it split, and keep a clean history roommates can trust.",
  },
  {
    icon: PieChart,
    title: "Balances & reports",
    body: "See who owes whom at a glance and export a polished PDF when you need it.",
  },
  {
    icon: Users,
    title: "Household members",
    body: "Add roommates once; reuse them across every bill without retyping names.",
  },
  {
    icon: Bell,
    title: "WhatsApp-friendly",
    body: "Optional pings when expenses change — great for groups that live in chat.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeatureCards() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="absolute inset-x-4 inset-y-8 -z-10 rounded-[2rem] bg-gradient-to-b from-indigo-500/[0.07] via-purple-500/[0.05] to-transparent dark:from-indigo-500/15 dark:via-purple-600/10 dark:to-transparent md:inset-x-6" />
      <motion.h2
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center text-3xl font-bold tracking-tight md:text-4xl"
      >
        Everything a shared flat needs
      </motion.h2>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground"
      >
        Premium clarity without the corporate bloat — fast to set up, delightful on mobile, and
        tuned for dark mode.
      </motion.p>
      <motion.div
        variants={reduceMotion ? undefined : container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((f) => (
          <motion.div key={f.title} variants={reduceMotion ? undefined : item} className="h-full">
            <motion.div
              whileHover={
                reduceMotion
                  ? undefined
                  : { y: -6, rotate: -0.8, transition: { type: "spring", stiffness: 400, damping: 22 } }
              }
              className="h-full"
            >
              <Card className="group h-full rounded-3xl border-white/25 bg-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_20px_56px_rgba(99,102,241,0.18)] dark:border-white/10 dark:bg-slate-950/50 dark:hover:shadow-[0_20px_56px_rgba(99,102,241,0.22)]">
                <CardHeader className="pb-2">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_28px_rgba(99,102,241,0.45)] ring-4 ring-indigo-500/10 transition-transform duration-300 group-hover:scale-105 dark:shadow-[0_8px_28px_rgba(129,140,248,0.4)] dark:ring-indigo-400/15">
                    <f.icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <CardTitle className="text-lg font-semibold tracking-tight">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
