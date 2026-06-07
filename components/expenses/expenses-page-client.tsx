"use client";

import { deleteExpenseAction } from "@/app/actions/expenses";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { CategoryIcon } from "@/components/icons/category-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatInr } from "@/lib/utils";
import { buildTelegramShareUrl, shareTextNative } from "@/lib/share";
import type { ExpenseDTO, UserDTO } from "@/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRefetchIntervalMs } from "@/hooks/use-refetch-interval";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Eye, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { isHouseAdminUser } from "@/lib/roles";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ExpensesPageClient({ monthKey }: { monthKey: string }) {
  const { data: session } = useSession();
  const isHouseAdmin = isHouseAdminUser(session?.user);
  const actorLedgerUserId = session?.user?.ledgerUserId ?? null;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState<string>("all");
  const [paidBy, setPaidBy] = useState<string>("all");
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingFallback, setViewingFallback] = useState<ExpenseDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
  });

  const filters = useMemo(
    () => ({
      month: monthKey,
      category: category === "all" ? undefined : category,
      paidBy: paidBy === "all" ? undefined : paidBy,
      search: debouncedSearch.trim() || undefined,
    }),
    [monthKey, category, paidBy, debouncedSearch],
  );

  const refetchInterval = useRefetchIntervalMs(20_000);

  const { data: expenses, isLoading } = useQuery({
    queryKey: queryKeys.expenses(filters),
    queryFn: async (): Promise<ExpenseDTO[]> => {
      const p = new URLSearchParams();
      p.set("month", monthKey);
      if (filters.category) p.set("category", filters.category);
      if (filters.paidBy) p.set("paidBy", filters.paidBy);
      if (filters.search) p.set("search", filters.search);
      const r = await fetch(`/api/expenses?${p}`);
      if (!r.ok) throw new Error("expenses");
      return r.json();
    },
    refetchInterval,
  });

  const { data: dashboard } = useQuery({
    queryKey: queryKeys.dashboard(monthKey),
    queryFn: async () => {
      const r = await fetch(`/api/dashboard?month=${encodeURIComponent(monthKey)}`);
      if (!r.ok) throw new Error("dashboard");
      return r.json();
    },
  });

  const currentBalances = useMemo(() => {
    if (!dashboard?.balances) return {};
    return Object.fromEntries(dashboard.balances.map((b: { userId: string; balance: number }) => [b.userId, b.balance]));
  }, [dashboard]);

  const userMap = useMemo(() => new Map(users.map((u) => [u._id, u.name])), [users]);

  const viewingExpense = useMemo(() => {
    if (!viewingId) return null;
    return expenses?.find((e) => e._id === viewingId) ?? viewingFallback;
  }, [viewingId, expenses, viewingFallback]);

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await deleteExpenseAction(id);
      if (!r.ok) throw new Error(r.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.expenses(filters) });
      const prev = qc.getQueryData<ExpenseDTO[]>(queryKeys.expenses(filters));
      qc.setQueryData<ExpenseDTO[]>(queryKeys.expenses(filters), (old) =>
        old ? old.filter((e) => e._id !== id) : [],
      );
      return { prev };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.expenses(filters), ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: queryKeys.expenses(filters) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: ["auditLogs"] });
      setDeleteId(null);
    },
  });

  function openView(e: ExpenseDTO) {
    setViewingId(e._id);
    setViewingFallback(e);
    setDetailOpen(true);
  }

  async function shareExpense(e: ExpenseDTO) {
    const payer = userMap.get(e.paidBy) ?? "Someone";
    const text = [
      `Expense: ${e.title}`,
      `Amount: ${formatInr(e.amount)}`,
      `Category: ${e.category}`,
      `Paid by: ${payer}`,
      `Date: ${new Date(e.date).toLocaleDateString()}`,
    ].join("\n");
    const ok = await shareTextNative(text, "Expense details");
    if (ok) return toast.success("Expense shared");
    window.open(buildTelegramShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Expenses</h2>
            {dashboard?.pendingExpensesCount > 0 ? (
              <Badge variant="secondary" className="rounded-full">
                {dashboard.pendingExpensesCount} pending
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Filter by month, category, or payer. You can edit expenses you created.
          </p>
        </div>
        <Button
          className="hidden h-11 rounded-xl md:inline-flex"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add expense
        </Button>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search applies to title, notes, and description</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl sm:col-span-2 lg:col-span-1"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Paid by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Anyone</SelectItem>
              {users.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : !expenses?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No expenses match.</p>
          ) : (
            <ul className="divide-y">
              {expenses.map((e) => {
                const canEditExpense = isHouseAdmin || (actorLedgerUserId != null && actorLedgerUserId === e.paidBy);
                return (
                  <li key={e._id}>
                    <div
                      className={cn(
                        "flex flex-col gap-3 p-4 transition-[box-shadow,transform] duration-200 md:flex-row md:items-center md:justify-between md:gap-4",
                        "motion-reduce:transform-none",
                        "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:transform-none",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                          <CategoryIcon category={e.category as ExpenseCategory} className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {e.billImage ? (
                          <Image
                            src={e.billImage}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-lg border object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium leading-snug">
                            {e.title}
                            {e.status === "pending" ? (
                              <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">
                                Pending
                              </Badge>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {e.category} · Paid by {userMap.get(e.paidBy) ?? "?"} ·{" "}
                            {new Date(e.date).toLocaleDateString()}
                          </p>
                          {e.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                          ) : e.notes ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">{e.notes}</p>
                          ) : null}
                          {!e.splitEnabled ? (
                            <p className="text-xs text-amber-700 dark:text-amber-400">House expense (no split)</p>
                          ) : e.splitMode === "custom" ? (
                            <p className="text-xs text-muted-foreground">Custom split</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between md:min-w-[190px] md:flex-col md:items-end md:justify-center lg:min-w-0 lg:flex-row lg:items-center">
                        <span className="text-right text-lg font-semibold tabular-nums sm:text-left md:text-right">
                          {formatInr(e.amount)}
                        </span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-9 rounded-xl"
                            onClick={() => openView(e)}
                          >
                            <Eye className="mr-1 h-4 w-4 shrink-0" />
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl"
                            onClick={() => shareExpense(e)}
                          >
                            <Share2 className="h-4 w-4 shrink-0" />
                          </Button>
                          {canEditExpense ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl"
                                title={isHouseAdmin ? "Edit expense" : "You can edit your own expense"}
                                onClick={() => {
                                  setEditing(e);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 shrink-0" />
                              </Button>
                              {isHouseAdmin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl text-destructive"
                                onClick={() => setDeleteId(e._id)}
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                              </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        users={users}
        monthKey={monthKey}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        expense={editing}
        currentBalances={currentBalances}
      />

      <ExpenseDetailDialog
        expense={viewingExpense}
        users={users}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) {
            setViewingId(null);
            setViewingFallback(null);
          }
        }}
      />

      <Button
        type="button"
        size="lg"
        className="fixed z-40 h-14 rounded-full shadow-lg md:hidden bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
        onClick={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        aria-label="Add expense"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delMut.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
