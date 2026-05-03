"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col touch-manipulation lg:flex-row">
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-1 flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(2.5rem,env(safe-area-inset-top))] text-primary-foreground lg:max-w-md lg:px-12 lg:py-14"
      >
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-primary-foreground/95">
            SanaFathima Mansion
          </Link>
          <p className="mt-12 text-sm font-medium uppercase tracking-widest text-primary-foreground/70">
            Shared expenses
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-sm text-primary-foreground/85">{subtitle}</p>
          ) : null}
        </div>
        <blockquote className="mt-12 border-l-2 border-primary-foreground/40 pl-4 lg:mt-0">
          <p className="text-lg font-medium leading-relaxed text-primary-foreground/95">
            &ldquo;Good accounts make good friendships.&rdquo;
          </p>
          <footer className="mt-3 text-sm text-primary-foreground/70">Household wisdom</footer>
        </blockquote>
      </motion.aside>
      <div className="flex flex-1 items-center justify-center py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] lg:px-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
