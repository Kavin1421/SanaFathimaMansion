"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, useReducedMotion } from "framer-motion";

const placeholders = [
  { initials: "KF", name: "Kavitha" },
  { initials: "AR", name: "Arun" },
  { initials: "DM", name: "Dilip" },
];

export function TrustSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/70 via-white/50 to-indigo-50/40 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:from-slate-950/70 dark:via-slate-950/50 dark:to-indigo-950/30 dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] md:p-14"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/25 to-purple-600/10 blur-2xl" />
        <div className="relative flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
          <div className="flex -space-x-3">
            {placeholders.map((p, i) => (
              <motion.div
                key={p.initials}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, type: "spring", stiffness: 380, damping: 22 }}
              >
                <Avatar className="h-14 w-14 border-2 border-background shadow-lg ring-2 ring-indigo-500/20 dark:ring-indigo-400/20">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                    {p.initials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-xl font-medium leading-relaxed md:text-2xl md:leading-snug">
              &ldquo;Good accounts make good friendships — we finally stopped arguing about rent
              splits.&rdquo;
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              From households like yours · placeholder story
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
