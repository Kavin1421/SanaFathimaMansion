"use client";

import { setAccountRoleAction } from "@/app/actions/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/users/role-badge";
import { queryKeys } from "@/lib/query-keys";
import type { UserDTO } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Shield, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function HouseholdAccessPanel({ users }: { users: UserDTO[] }) {
  const { data: session, update } = useSession();
  const qc = useQueryClient();

  const roleMut = useMutation({
    mutationFn: async (payload: { accountId: string; role: "admin" | "user" }) => {
      const r = await setAccountRoleAction(payload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: async (data) => {
      toast.success(`${data.email} is now ${data.role === "admin" ? "an Admin" : "a Member"}`);
      qc.invalidateQueries({ queryKey: queryKeys.users });
      if (session?.user?.id === data.id) {
        await update?.({ role: data.role });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withAccounts = users.filter((u) => u.account);
  const adminCount = withAccounts.filter(
    (u) => u.account?.isSuperAdmin || u.account?.role === "admin",
  ).length;

  return (
    <Card className="rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Household access control
        </CardTitle>
        <CardDescription>
          Promote trusted roommates to <strong>Admin</strong> so they can invite people, set the monthly
          budget, and moderate expenses. Only you (Super Admin) can change roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="text-xs text-muted-foreground">Super Admin</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium">
              <Crown className="h-4 w-4 text-primary" /> Platform owner · audit & roles
            </p>
          </div>
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="mt-1 text-sm font-medium">{adminCount} with household controls</p>
          </div>
          <div className="rounded-xl border bg-background/80 px-4 py-3">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="mt-1 text-sm font-medium">
              {withAccounts.length - adminCount} standard access
            </p>
          </div>
        </div>

        <ul className="divide-y rounded-xl border bg-background/80">
          {withAccounts.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No signed-in accounts yet. Roles can be assigned after roommates register.
            </li>
          ) : (
            withAccounts.map((u) => {
              const acc = u.account!;
              const locked = acc.isSuperAdmin;
              return (
                <li
                  key={u._id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RoleBadge role={acc.role} isSuperAdmin={acc.isSuperAdmin} />
                    {locked ? (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    ) : (
                      <Select
                        value={acc.role}
                        disabled={roleMut.isPending}
                        onValueChange={(v) =>
                          roleMut.mutate({
                            accountId: acc.id,
                            role: v as "admin" | "user",
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-[130px] rounded-xl">
                          {roleMut.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-start gap-2 rounded-xl border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Admin</strong> can invite/edit roommates, delete any expense, and manage the monthly
            wallet. <strong>Member</strong> can log expenses, settle balances, and edit their own entries.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
