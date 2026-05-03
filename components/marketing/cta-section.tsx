"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-28 pt-8 md:px-6 md:pb-36">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-white/75 via-indigo-50/50 to-purple-50/60 p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/10 dark:from-slate-950/75 dark:via-indigo-950/40 dark:to-purple-950/35 dark:shadow-[0_10px_40px_rgba(0,0,0,0.45)] md:p-16"
      >
        <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/25" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl dark:bg-purple-500/25" />
        <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">
          Create your household
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-muted-foreground">
          Name your place, add roommates, and land on a dashboard that feels alive — in about a
          minute.
        </p>
        <motion.div
          className="relative mt-10 inline-block"
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <Button
            size="lg"
            asChild
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-10 text-base font-semibold text-white shadow-[0_10px_40px_rgba(79,70,229,0.45)] hover:shadow-[0_14px_52px_rgba(99,102,241,0.55)] dark:shadow-[0_10px_40px_rgba(99,102,241,0.35)]"
          >
            <Link href="/signup" className="inline-flex items-center gap-2">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
