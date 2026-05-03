"use client";

import { DEFAULT_HOUSE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMonthParam } from "@/hooks/use-month";
import { format, parse } from "date-fns";
import { BarChart3, LayoutDashboard, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/users", label: "Users", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { monthKey, setMonthKey } = useMonthParam();
  const year = monthKey.slice(0, 4);
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  return (
    <div className={cn("flex h-full flex-col gap-6", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">House</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{DEFAULT_HOUSE_NAME}</p>
        <p className="text-xs text-muted-foreground">Shared expenses</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const to = `${href}?month=${encodeURIComponent(monthKey)}`;
          return (
            <Link
              key={href}
              href={to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-l-2 border-primary bg-primary/10 text-foreground"
                  : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {year}
        </p>
        <div className="grid max-h-[40vh] grid-cols-3 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
          {monthKeys.map((key) => {
            const active = key === monthKey;
            const label = format(parse(`${key}-01`, "yyyy-MM-dd", new Date()), "MMM");
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMonthKey(key)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
