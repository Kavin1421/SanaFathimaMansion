"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";

export function DashboardPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="dashboard-preview" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
          Animated dashboard preview
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          Static mock — no login required. The real app adds live data after you sign in.
        </p>
        <Card className="mx-auto mt-8 max-w-3xl border-white/20 bg-white/60 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Balance overview</CardTitle>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Demo
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "You owe", value: "₹1,240" },
                { label: "Owed to you", value: "₹3,890" },
                { label: "This month", value: "₹18.2k" },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 * i }}
                  className="rounded-2xl border border-white/10 bg-background/40 p-4 dark:bg-background/20"
                >
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{row.value}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 h-32 rounded-xl bg-gradient-to-t from-primary/10 to-transparent" />
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
