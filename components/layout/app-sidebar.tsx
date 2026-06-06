"use client";

import { DEFAULT_HOUSE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMonthParam } from "@/hooks/use-month";
import { format, parse } from "date-fns";
import {
  BarChart3,
  BellRing,
  Handshake,
  LayoutDashboard,
  Receipt,
  ScrollText,
  ShoppingCart,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/pre-bills", label: "Pre-bills", icon: ShoppingCart },
  { href: "/settlements", label: "Settlements", icon: Handshake },
  { href: "/users", label: "Users", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/audit-logs", label: "Audit logs", icon: ScrollText, superAdminOnly: true },
  { href: "/notification-events", label: "Notification events", icon: BellRing, superAdminOnly: true },
];

export function AppSidebar({
  className,
  houseName,
  showAuditNav = false,
  onNavigate,
}: {
  className?: string;
  houseName?: string;
  showAuditNav?: boolean;
  /** Called after a nav link is chosen (e.g. close mobile sheet). */
  onNavigate?: () => void;
}) {
  const displayHouse = houseName?.trim() || DEFAULT_HOUSE_NAME;
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
        <p className="mt-1 text-lg font-semibold tracking-tight">{displayHouse}</p>
        <p className="text-xs text-muted-foreground">Shared expenses</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navLinks
          .filter((l) => !l.superAdminOnly || showAuditNav)
          .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const to = href === "/profile" ? href : `${href}?month=${encodeURIComponent(monthKey)}`;
          return (
            <Link
              key={href}
              href={to}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:min-h-0",
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
        <div className="grid max-h-[min(40vh,16rem)] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 md:max-h-[40vh]">
          {monthKeys.map((key) => {
            const active = key === monthKey;
            const label = format(parse(`${key}-01`, "yyyy-MM-dd", new Date()), "MMM");
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMonthKey(key);
                  onNavigate?.();
                }}
                className={cn(
                  "min-h-10 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors md:min-h-0 md:py-1.5",
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
