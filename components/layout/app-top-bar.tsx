"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MonthSelect } from "@/components/month-select";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { LogOut, Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const pathTitles: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/expenses", title: "Expenses" },
  { prefix: "/settlements", title: "Settlements" },
  { prefix: "/users", title: "Users" },
  { prefix: "/reports", title: "Reports" },
  { prefix: "/audit-logs", title: "Audit logs" },
  { prefix: "/notification-events", title: "Notification events" },
  { prefix: "/onboarding", title: "Welcome" },
];

function titleForPath(pathname: string): string {
  const hit = pathTitles.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return hit?.title ?? "SanaFathima Mansion";
}

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppTopBar({
  houseName,
  showAuditNav = false,
}: {
  houseName?: string;
  showAuditNav?: boolean;
}) {
  const pathname = usePathname();
  const { monthKey, setMonthKey } = useMonthParam();
  const title = titleForPath(pathname);
  const { data: session } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const { data: users } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    staleTime: 60_000,
  });

  const firstLedger = users?.[0];
  const displayName = session?.user?.name ?? firstLedger?.name;
  const avatarSrc = session?.user?.image ?? firstLedger?.avatar;
  const initials = initialsFromName(displayName);

  return (
    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background/80 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md sm:flex-nowrap md:min-h-16 md:py-0 md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))] md:pt-0">
      <div className="flex min-w-0 min-h-10 flex-1 items-center gap-2 sm:gap-3 md:flex-initial md:min-h-0">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100vw-1rem,20rem)] max-w-[calc(100vw-env(safe-area-inset-left)-0.5rem)] p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar
              houseName={houseName}
              showAuditNav={showAuditNav}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg md:flex-initial md:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto sm:justify-start md:gap-3">
        <MonthSelect value={monthKey} onChange={setMonthKey} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:w-10"
              aria-label="Account menu"
            >
              <Avatar className="h-9 w-9 border md:h-9 md:w-9">
                {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName ?? "Account"} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium leading-none">{displayName ?? "Signed in"}</p>
                {session?.user?.email ? (
                  <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
