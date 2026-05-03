"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

export function CTASection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pb-32">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl rounded-3xl border border-white/20 bg-white/70 p-10 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 md:p-14"
      >
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Create your household</h2>
        <p className="mt-4 text-muted-foreground">
          Name your place, add roommates, and you&apos;re on the dashboard in a minute.
        </p>
        <Button size="lg" asChild className="mt-8 rounded-xl">
          <Link href="/signup">Create your account</Link>
        </Button>
      </motion.div>
    </section>
  );
}
