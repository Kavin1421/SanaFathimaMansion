"use client";

import { deleteExpenseAction } from "@/app/actions/expenses";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
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
import { CATEGORY_META, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { ExpenseDTO, UserDTO } from "@/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function ExpensesPageClient({ monthKey }: { monthKey: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState<string>("all");
  const [paidBy, setPaidBy] = useState<string>("all");
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  });

  const userMap = useMemo(() => new Map(users.map((u) => [u._id, u.name])), [users]);

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
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Expenses</h2>
          <p className="text-sm text-muted-foreground">Filter by month, category, or payer</p>
        </div>
        <Button
          className="hidden rounded-xl md:inline-flex"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add expense
        </Button>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search applies to title, notes, and description</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl md:max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].emoji} {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger className="rounded-xl md:w-[200px]">
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

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !expenses?.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No expenses match.</p>
          ) : (
            <ul className="divide-y">
              {expenses.map((e) => (
                <li key={e._id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_META[e.category as ExpenseCategory].emoji} {e.category} · Paid by{" "}
                      {userMap.get(e.paidBy) ?? "?"} · {new Date(e.date).toLocaleDateString()}
                    </p>
                    {e.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                    ) : e.notes ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.notes}</p>
                    ) : null}
                    {!e.splitEnabled ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400">House expense (no split)</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold tabular-nums">{formatInr(e.amount)}</span>
                    {e.billImage ? <ImagePreviewDialog src={e.billImage} title={e.title} /> : null}
                    {isAdmin ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setEditing(e);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-destructive"
                          onClick={() => setDeleteId(e._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
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
      />

      <Button
        type="button"
        size="lg"
        className="fixed bottom-5 right-4 z-40 h-14 rounded-full shadow-lg md:hidden"
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
