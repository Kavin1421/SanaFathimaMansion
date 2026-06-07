"use client";

import { duplicatePreBillAction } from "@/app/actions/pre-bills";
import { PreBillEditor } from "@/components/pre-bills/pre-bill-editor";
import { PreBillExpenseWizard } from "@/components/pre-bills/pre-bill-expense-wizard";
import { PreBillReadonlyShoppingList } from "@/components/pre-bills/pre-bill-readonly-shopping-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPreBillItemsForExpenseNotes, sumOptionalLinePrices } from "@/lib/pre-bill-utils";
import { queryKeys } from "@/lib/query-keys";
import type { PreBillDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMonthParam } from "@/hooks/use-month";
import { format } from "date-fns";
import { ArrowLeft, Copy, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PreBillDetailClient({
  id,
  initialData,
  creatorName,
  currentUserLedgerId,
  isSuperAdmin,
}: {
  id: string;
  initialData: PreBillDTO | null;
  creatorName: string;
  currentUserLedgerId: string | null;
  isSuperAdmin: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { monthKey } = useMonthParam();
  const { data: session } = useSession();
  const ledgerUserId = session?.user?.ledgerUserId ?? null;

  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: preBill = initialData, refetch } = useQuery({
    queryKey: ["preBill", id],
    queryFn: async (): Promise<PreBillDTO> => {
      const r = await fetch(`/api/pre-bills/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error("pre-bill");
      return r.json();
    },
    initialData: initialData ?? undefined,
    enabled: Boolean(id),
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
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

  const dupMut = useMutation({
    mutationFn: async () => {
      const res = await duplicatePreBillAction({ id });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success("Duplicate created");
      router.push(`/pre-bills/${data._id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canEditDraft =
    preBill?.status === "draft" &&
    (isSuperAdmin || preBill.createdBy === currentUserLedgerId);

  const canEditFinalized = Boolean(
    preBill &&
      preBill.status === "finalized" &&
      currentUserLedgerId &&
      (isSuperAdmin || preBill.createdBy === currentUserLedgerId),
  );

  const canTogglePurchase = Boolean(currentUserLedgerId) || isSuperAdmin;

  const suggestedAmount = useMemo(() => {
    if (!preBill?.items?.length) return 0;
    return sumOptionalLinePrices(preBill.items);
  }, [preBill]);

  const expenseNotes = useMemo(() => {
    if (!preBill) return "";
    return formatPreBillItemsForExpenseNotes(preBill.items, preBill.notes);
  }, [preBill]);

  const preBillSeed = useMemo(() => {
    if (!preBill || preBill.status !== "finalized") return null;
    return {
      title: preBill.title,
      category: preBill.category,
      notes: expenseNotes,
      suggestedAmount: suggestedAmount > 0 ? suggestedAmount : undefined,
    };
  }, [preBill, expenseNotes, suggestedAmount]);

  if (!preBill) {
    return <p className="text-sm text-muted-foreground">Pre-bill not found.</p>;
  }

  const statusBadgeClass =
    preBill.status === "draft"
      ? "border-transparent bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
      : "border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400";

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-30 mb-8 border-b border-border/70 bg-background/90 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Button variant="ghost" size="sm" className="-ml-2 mb-1 h-9 rounded-xl text-muted-foreground" asChild>
              <Link href="/pre-bills">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                All pre-bills
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{preBill.title}</h1>
              <Badge className={cn("rounded-full px-3 py-0.5 text-xs font-medium", statusBadgeClass)}>
                {preBill.status === "draft" ? "Draft" : "Finalized"}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
              <span>
                <span className="font-medium text-foreground/80">Creator · </span>
                {creatorName}
              </span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground/80">Created · </span>
                {format(new Date(preBill.createdAt), "d MMM yyyy · HH:mm")}
              </span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground/80">Updated · </span>
                {format(new Date(preBill.updatedAt), "d MMM yyyy · HH:mm")}
              </span>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl shadow-sm transition hover:scale-[1.02] hover:shadow-md"
              onClick={() => dupMut.mutate()}
              disabled={dupMut.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {canEditDraft || canEditFinalized ? (
          <PreBillEditor
            key={`${preBill._id}-${preBill.status}`}
            preBill={preBill}
            onUpdated={() => void refetch()}
            canTogglePurchase={canTogglePurchase}
          />
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
              <Separator />
              <Card className="rounded-2xl border shadow-md transition-shadow duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {preBill.notes?.trim() ? preBill.notes : "No notes for this pre-bill."}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Shopping list</h2>
              <Separator />
              <PreBillReadonlyShoppingList
                preBill={preBill}
                canToggle={canTogglePurchase}
                onUpdated={() => void refetch()}
              />
            </section>
          </>
        )}

        {preBill.status === "finalized" && !preBill.linkedExpenseId ? (
          <section className="rounded-2xl border border-dashed border-primary/25 bg-muted/30 p-6 shadow-inner transition hover:border-primary/40">
            <p className="mb-4 text-sm text-muted-foreground">
              Turn this list into a ledger expense when you have the receipt and final amount.
            </p>
            <Button type="button" className="rounded-xl shadow-sm transition hover:scale-[1.02]" onClick={() => setWizardOpen(true)}>
              <Wallet className="mr-2 h-4 w-4" />
              Book as expense
            </Button>
          </section>
        ) : null}
        {preBill.linkedExpenseId ? (
          <p className="text-sm text-muted-foreground">
            Linked expense:{" "}
            <Link href="/expenses" className="font-medium text-primary underline-offset-4 hover:underline">
              View expenses
            </Link>
          </p>
        ) : null}
      </div>

      {preBillSeed ? (
        <PreBillExpenseWizard
          preBill={preBill}
          preBillSeed={preBillSeed}
          users={users}
          monthKey={monthKey}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          defaultPaidById={ledgerUserId ?? undefined}
          currentBalances={currentBalances}
          onLinked={() => void refetch()}
        />
      ) : null}
    </div>
  );
}
