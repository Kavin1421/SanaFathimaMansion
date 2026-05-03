"use client";

import { createUserAction, deleteUserAction, updateUserAction } from "@/app/actions/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function UsersPageClient() {
  const { data: session } = useSession();
  const isSuperAdmin = Boolean(session?.user?.isSuperAdmin);
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      if (editing) {
        const r = await updateUserAction({ id: editing._id, name: name.trim(), avatar });
        if (!r.ok) throw new Error(r.error);
        return r.data;
      }
      const r = await createUserAction({ name: name.trim(), avatar });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Roommate added");
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await deleteUserAction(id);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setName("");
    setAvatar("");
    setDialogOpen(true);
  }

  function openEdit(u: UserDTO) {
    setEditing(u);
    setName(u.name);
    setAvatar(u.avatar ?? "");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Roommates</h2>
          <p className="text-sm text-muted-foreground">Balances update from the shared ledger</p>
        </div>
        <Button className="rounded-xl gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add roommate
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {users?.map((u) => (
            <Card key={u._id} className="rounded-2xl border shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border">
                    {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                    <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{u.name}</CardTitle>
                    <CardDescription>Total paid · {formatInr(u.totalPaid)}</CardDescription>
                  </div>
                </div>
                {isSuperAdmin ? (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl text-destructive"
                      onClick={() => setDeleteId(u._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <Badge variant={u.balance > 0 ? "success" : u.balance < 0 ? "danger" : "secondary"}>
                    {u.balance > 0 ? "+" : ""}
                    {formatInr(u.balance)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit roommate" : "New roommate"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="uname">Name</Label>
              <Input
                id="uname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
                placeholder="Kevin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uavatar">Avatar URL (optional)</Label>
              <Input
                id="uavatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="rounded-xl"
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove roommate?</AlertDialogTitle>
            <AlertDialogDescription>
              They must have no linked expenses. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delMut.mutate(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
