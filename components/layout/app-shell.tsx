"use client";

import type { ReactNode } from "react";
import { UserErrorBoundary } from "@/components/error-boundary";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";

export function AppShell({
  children,
  houseName,
  showAuditNav = false,
}: {
  children: ReactNode;
  /** From DB / env; falls back inside sidebar if omitted */
  houseName?: string;
  showAuditNav?: boolean;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="glass hidden w-64 shrink-0 flex-col border-r p-4 md:flex lg:w-72">
        <AppSidebar houseName={houseName} showAuditNav={showAuditNav} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar houseName={houseName} showAuditNav={showAuditNav} />
        <main className="mx-auto w-full max-w-7xl flex-1 py-6 pb-[max(5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 md:py-10 md:pb-24 md:pl-[max(2rem,env(safe-area-inset-left))] md:pr-[max(2rem,env(safe-area-inset-right))]">
          <UserErrorBoundary title="This page ran into a problem">{children}</UserErrorBoundary>
        </main>
      </div>
    </div>
  );
}
