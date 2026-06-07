"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { permissionsForRole, permissionsSummary } from "@/lib/role-permissions";
import { isHouseAdminUser } from "@/lib/roles";
import { Check, Shield, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function RolePermissionsCard() {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user || user.isSuperAdmin) return null;

  const isAdmin = isHouseAdminUser(user);
  const role = isAdmin ? "admin" : "user";
  const permissions = permissionsForRole(role);

  return (
    <Card className="rounded-2xl border border-primary/15 bg-primary/[0.03] shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Your access
        </CardTitle>
        <CardDescription>{permissionsSummary(role)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-xl border bg-background/80">
          {permissions.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  item.allowed
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {item.allowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <span className={cn(!item.allowed && "text-muted-foreground")}>{item.label}</span>
            </li>
          ))}
        </ul>

        {!isAdmin ? (
          <p className="text-xs text-muted-foreground">
            Need to invite roommates or manage the monthly wallet?{" "}
            <Link href="/users" className="font-medium text-primary underline-offset-4 hover:underline">
              Users page
            </Link>{" "}
            — only the Super Admin can promote you to Admin.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            To assign Admin or Member roles, the Super Admin uses the access panel on the{" "}
            <Link href="/users" className="font-medium text-primary underline-offset-4 hover:underline">
              Users page
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
