"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, useReducedMotion } from "framer-motion";

const people = [
  { initials: "DN", label: "Dinesh" },
  { initials: "KV", label: "Kevin" },
  { initials: "AR", label: "Arun" },
  { initials: "FM", label: "Fathima" },
  { initials: "DL", label: "Dilip" },
  { initials: "SK", label: "Sana" },
];

export function TrustStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-y border-white/10 bg-white/30 py-10 backdrop-blur-md dark:border-white/5 dark:bg-slate-950/40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent dark:via-indigo-400/30" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 text-center md:flex-row md:justify-center md:gap-10 md:px-6 md:text-left">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Used by modern shared homes
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <div className="flex -space-x-2.5">
            {people.map((p, i) => (
              <motion.div
                key={p.initials}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.04 * i, type: "spring", stiffness: 400, damping: 24 }}
              >
                <Avatar className="h-11 w-11 border-2 border-background shadow-md ring-2 ring-indigo-500/20 dark:ring-indigo-400/25">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-xs font-bold text-white">
                    {p.initials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-xs text-sm leading-relaxed text-muted-foreground/95 md:max-w-none"
          >
            Built for roommates who care about clarity
          </motion.p>
        </div>
      </div>
    </section>
  );
}
