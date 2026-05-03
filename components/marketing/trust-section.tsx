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
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-white/15 bg-white/50 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 md:p-12"
      >
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <div className="flex -space-x-3">
            {placeholders.map((p, i) => (
              <motion.div
                key={p.initials}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                    {p.initials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium leading-relaxed md:text-xl">
              &ldquo;Good accounts make good friendships — we finally stopped arguing about rent
              splits.&rdquo;
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Placeholder testimonial · your crew next</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
