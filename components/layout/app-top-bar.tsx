"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MonthSelect } from "@/components/month-select";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { queryKeys } from "@/lib/query-keys";
import { useMonthParam } from "@/hooks/use-month";
import type { UserDTO } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const pathTitles: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/expenses", title: "Expenses" },
  { prefix: "/users", title: "Users" },
  { prefix: "/reports", title: "Reports" },
];

function titleForPath(pathname: string): string {
  const hit = pathTitles.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return hit?.title ?? "SanaFathima Mansion";
}

export function AppTopBar() {
  const pathname = usePathname();
  const { monthKey, setMonthKey } = useMonthParam();
  const title = titleForPath(pathname);

  const { data: users } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    staleTime: 60_000,
  });

  const first = users?.[0];
  const initials =
    first?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,20rem)] p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar />
          </SheetContent>
        </Sheet>
        <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <MonthSelect value={monthKey} onChange={setMonthKey} />
        <ThemeToggle />
        <Avatar className="h-9 w-9 border">
          {first?.avatar ? (
            <AvatarImage src={first.avatar} alt={first.name} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
