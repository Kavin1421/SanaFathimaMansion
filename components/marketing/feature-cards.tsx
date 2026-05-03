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
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function FeatureCards() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <motion.h2
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
        className="text-center text-3xl font-bold tracking-tight md:text-4xl"
      >
        Everything a shared flat needs
      </motion.h2>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground"
      >
        Built for a single household MVP — fast to set up, easy to use on mobile, and ready for dark
        mode.
      </motion.p>
      <motion.div
        variants={reduceMotion ? undefined : container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((f) => (
          <motion.div key={f.title} variants={reduceMotion ? undefined : item}>
            <Card className="h-full border-white/20 bg-white/60 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
