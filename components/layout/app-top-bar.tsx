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

const pathTitles: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/expenses", title: "Expenses" },
  { prefix: "/users", title: "Users" },
  { prefix: "/reports", title: "Reports" },
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

export function AppTopBar({ houseName }: { houseName?: string }) {
  const pathname = usePathname();
  const { monthKey, setMonthKey } = useMonthParam();
  const title = titleForPath(pathname);
  const { data: session } = useSession();

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
            <AppSidebar houseName={houseName} />
          </SheetContent>
        </Sheet>
        <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <MonthSelect value={monthKey} onChange={setMonthKey} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account menu"
            >
              <Avatar className="h-9 w-9 border">
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
