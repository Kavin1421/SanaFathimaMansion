"use client";

import { PremiumEmptyState } from "@/components/lottie/premium-empty-state";
import {
  deletePreBillAction,
  duplicatePreBillAction,
  finalizePreBillAction,
} from "@/app/actions/pre-bills";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPreBillLineCompact } from "@/lib/pre-bill-utils";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import type { PreBillDTO, UserDTO } from "@/types";
import { useRefetchIntervalMs } from "@/hooks/use-refetch-interval";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Shield,
  Trash2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

type SortKey = "recent" | "items" | "status";
type StatusFilter = "all" | "draft" | "finalized";

function applySort(rows: PreBillDTO[], sortKey: SortKey): PreBillDTO[] {
  const out = [...rows];
  switch (sortKey) {
    case "recent":
      out.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      break;
    case "items":
      out.sort(
        (a, b) =>
          b.items.length - a.items.length ||
          +new Date(b.updatedAt) - +new Date(a.updatedAt),
      );
      break;
    case "status":
      out.sort((a, b) => {
        const sa = a.status === "draft" ? 0 : 1;
        const sb = b.status === "draft" ? 0 : 1;
        return sa - sb || +new Date(b.updatedAt) - +new Date(a.updatedAt);
      });
      break;
    default:
      break;
  }
  return out;
}

export function PreBillsListClient({
  currentUserId,
  userEmail,
  isSuperAdmin,
}: {
  currentUserId: string;
  userEmail: string | null;
  isSuperAdmin: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finalizeId, setFinalizeId] = useState<string | null>(null);

  const refetchInterval = useRefetchIntervalMs(20_000);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: queryKeys.preBills(),
    queryFn: async (): Promise<PreBillDTO[]> => {
      const r = await fetch("/api/pre-bills");
      if (!r.ok) throw new Error("pre-bills");
      return r.json();
    },
    refetchInterval,
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
    staleTime: 60_000,
  });

  const creatorOf = (b: PreBillDTO) =>
    users.find((u) => u._id === b.createdBy);

  const dupMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await duplicatePreBillAction({ id });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Duplicate created");
      qc.invalidateQueries({ queryKey: queryKeys.preBills() });
      if (data) router.push(`/pre-bills/${data._id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await deletePreBillAction({ id });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Pre-bill deleted");
      qc.invalidateQueries({ queryKey: queryKeys.preBills() });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizeMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await finalizePreBillAction({ id });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pre-bill finalized — Telegram notified");
      qc.invalidateQueries({ queryKey: queryKeys.preBills() });
      qc.invalidateQueries({ queryKey: ["activity"] });
      setFinalizeId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (!q) return applySort(list, sortKey);
    const searched = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.items.some((i) => i.name.toLowerCase().includes(q)),
    );
    return applySort(searched, sortKey);
  }, [rows, search, sortKey, statusFilter]);

  const normEmail = (e: string | null | undefined) =>
    (e ?? "").toLowerCase().trim();

  function canDelete(b: PreBillDTO): boolean {
    if (isSuperAdmin) return true;
    const creator = creatorOf(b);
    return (
      !!userEmail &&
      !!creator?.email &&
      normEmail(creator.email) === normEmail(userEmail)
    );
  }

  function canEditDraft(b: PreBillDTO): boolean {
    return b.status === "draft" && (isSuperAdmin || b.createdBy === currentUserId);
  }

  /** Creator/admin can edit finalized lists fully (same as detail page). */
  function canEditFinalizedOptional(b: PreBillDTO): boolean {
    return (
      b.status === "finalized" &&
      (isSuperAdmin || b.createdBy === currentUserId)
    );
  }

  const deletingBill = deleteId ? rows.find((r) => r._id === deleteId) : null;
  const finalizingBill = finalizeId ? rows.find((r) => r._id === finalizeId) : null;

  return (
    <div className="relative pb-28 md:pb-0">
      <div className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Smart Pre-Bills</h2>
            <p className="max-w-xl text-base text-muted-foreground">
              Plan shopping like a pro — draft lists, finalize to ping the group on Telegram, then add
              the receipt to the ledger.
            </p>
          </div>
          <Button
            asChild
            className="hidden h-11 shrink-0 rounded-xl shadow-md transition hover:scale-[1.02] hover:shadow-lg md:inline-flex"
          >
            <Link href="/pre-bills/new">
              <Plus className="mr-2 h-4 w-4" />
              New pre-bill
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles or items…"
              className="h-11 rounded-xl border bg-background pl-9 shadow-sm transition focus-visible:ring-2"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5 rounded-xl border bg-muted/40 p-1">
              {(
                [
                  ["all", "All"],
                  ["draft", "Drafts"],
                  ["finalized", "Finalized"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={statusFilter === key ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-lg px-3 transition active:scale-[0.98]",
                    statusFilter === key && "shadow-sm",
                  )}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-11 w-full rounded-xl border shadow-sm sm:w-[180px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="items">Item count</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pre-bills…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 shadow-inner">
            <PremiumEmptyState
              scene="emptyInbox"
              title="Start planning your shopping"
              description="Create a draft list, share items with your household, then finalize when you are ready to shop."
            >
              <Button asChild className="mt-2 h-11 rounded-xl shadow-md transition hover:scale-[1.02]">
                <Link href="/pre-bills/new">Create your first Pre-Bill</Link>
              </Button>
            </PremiumEmptyState>
          </div>
        ) : filtered.length === 0 ? (
          <PremiumEmptyState
            scene="emptyInbox"
            title="No pre-bills match"
            description="Try adjusting search or filters."
            compact
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((b) => {
              const creator = creatorOf(b);
              const creatorName = creator?.name ?? "Unknown";
              const preview = b.items.slice(0, 3).map(formatPreBillLineCompact);
              const rest = Math.max(0, b.items.length - 3);

              return (
                <article
                  key={b._id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-md transition-all duration-300",
                    "hover:scale-[1.01] hover:shadow-lg",
                  )}
                >
                  <div className="flex flex-1 flex-col p-6 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
                        {b.title}
                      </h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          b.status === "draft"
                            ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                        )}
                      >
                        {b.status === "draft" ? "Draft" : "Finalized"}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-foreground/80">Items</dt>
                        <dd>{b.items.length}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-foreground/80">Created by</dt>
                        <dd className="truncate text-right">{creatorName}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-medium text-foreground/80">Updated</dt>
                        <dd className="text-right tabular-nums">
                          {format(new Date(b.updatedAt), "d MMM yyyy · HH:mm")}
                        </dd>
                      </div>
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-500">
                          <Shield className="h-3 w-3" />
                          Admin view
                        </div>
                      ) : null}
                    </dl>

                    {preview.length > 0 ? (
                      <div className="mt-5 rounded-xl border bg-muted/30 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Preview
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-foreground/90">
                          {preview.map((line, i) => (
                            <li key={i} className="leading-snug">
                              {line}
                            </li>
                          ))}
                          {rest > 0 ? (
                            <li className="text-muted-foreground">+{rest} more…</li>
                          ) : null}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-5 text-sm italic text-muted-foreground">No items yet</p>
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex flex-wrap gap-1 border-t bg-muted/20 px-3 py-3",
                      "opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
                    )}
                  >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg px-2.5 text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <Link href={`/pre-bills/${b._id}`}>
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      {canEditDraft(b) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg px-2.5 text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <Link href={`/pre-bills/${b._id}`}>
                            <Pencil className="mr-1.5 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      ) : canEditFinalizedOptional(b) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg px-2.5 text-muted-foreground hover:text-foreground"
                          asChild
                          title="Edit title, items, and notes"
                        >
                          <Link href={`/pre-bills/${b._id}`}>
                            <Pencil className="mr-1.5 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg px-2.5 text-muted-foreground hover:text-foreground"
                        disabled={dupMut.isPending}
                        onClick={() => dupMut.mutate(b._id)}
                      >
                        <Copy className="mr-1.5 h-4 w-4" />
                        Duplicate
                      </Button>
                      {b.status === "draft" && canEditDraft(b) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg px-2.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          disabled={finalizeMut.isPending}
                          onClick={() => setFinalizeId(b._id)}
                        >
                          <Send className="mr-1.5 h-4 w-4" />
                          Finalize
                        </Button>
                      ) : null}
                      {canDelete(b) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMut.isPending}
                          onClick={() => setDeleteId(b._id)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                      ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pre-bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingBill?.title ?? "this pre-bill"}
              </span>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(finalizeId)} onOpenChange={(o) => !o && setFinalizeId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize pre-bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Finalize{" "}
              <span className="font-medium text-foreground">
                {finalizingBill?.title ?? "this list"}
              </span>
              ? Your household will be notified on Telegram and you will not be able to edit items
              afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={finalizeMut.isPending}
              onClick={() => finalizeId && finalizeMut.mutate(finalizeId)}
            >
              {finalizeMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finalize & notify
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Button
          asChild
          className="h-12 w-full rounded-xl shadow-lg transition active:scale-[0.99]"
        >
          <Link href="/pre-bills/new">
            <Plus className="mr-2 h-5 w-5" />
            New Pre-Bill
          </Link>
        </Button>
      </div>
    </div>
  );
}
