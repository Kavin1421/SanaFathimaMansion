"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export function MarketingHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-white/15 bg-background/75 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-[hsl(229_45%_6%/0.82)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent dark:via-indigo-400/25" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-indigo-400 dark:to-purple-400"
        >
          SanaFathima Mansion
        </Link>
        <nav className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-xl">
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white shadow-[0_8px_28px_rgba(99,102,241,0.4)] hover:opacity-[0.96]"
          >
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
