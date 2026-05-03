"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="glass hidden w-64 shrink-0 flex-col border-r p-4 md:flex lg:w-72">
        <AppSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 md:px-8 md:py-10 md:pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
