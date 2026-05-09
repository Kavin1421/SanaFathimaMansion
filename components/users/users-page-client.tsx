"use client";

import {
  createUserAction,
  deleteUserAction,
  resendInviteAction,
  updateReminderPreferencesAction,
  updateUserAction,
} from "@/app/actions/users";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [prefFrequency, setPrefFrequency] = useState<"daily" | "weekly">("daily");
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefTelegram, setPrefTelegram] = useState(true);
  const [prefQuietStart, setPrefQuietStart] = useState("22");
  const [prefQuietEnd, setPrefQuietEnd] = useState("8");

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      if (!email.trim()) throw new Error("Email required");
      if (editing) {
        const r = await updateUserAction({ id: editing._id, name: name.trim(), email: email.trim(), avatar });
        if (!r.ok) throw new Error(r.error);
        return r.data;
      }
      const r = await createUserAction({ name: name.trim(), email: email.trim(), avatar });
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

  const resendMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await resendInviteAction(id);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Invite resent");
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prefMut = useMutation({
    mutationFn: async (payload: {
      userId: string;
      frequency: "daily" | "weekly";
      channels: { email: boolean; telegram: boolean };
      quietHours: { startHour: number; endHour: number };
    }) => {
      const r = await updateReminderPreferencesAction(payload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Reminder preferences updated");
      qc.invalidateQueries({ queryKey: queryKeys.users });
      qc.invalidateQueries({ queryKey: queryKeys.auditLogs({}) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myUser = users?.find((u) => u._id === session?.user?.ledgerUserId) ?? null;

  useEffect(() => {
    if (!myUser?.reminderPreferences) return;
    setPrefFrequency(myUser.reminderPreferences.frequency);
    setPrefEmail(myUser.reminderPreferences.channels.email);
    setPrefTelegram(myUser.reminderPreferences.channels.telegram);
    setPrefQuietStart(String(myUser.reminderPreferences.quietHours.startHour));
    setPrefQuietEnd(String(myUser.reminderPreferences.quietHours.endHour));
  }, [myUser]);

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setAvatar("");
    setDialogOpen(true);
  }

  function openEdit(u: UserDTO) {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setAvatar(u.avatar ?? "");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {myUser ? (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Your reminder preferences</CardTitle>
            <CardDescription>Control reminder frequency, channel, and quiet hours.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={prefFrequency}
                onValueChange={(v) => setPrefFrequency(v as "daily" | "weekly")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Monday)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={prefEmail ? "default" : "outline"} className="rounded-xl" onClick={() => setPrefEmail((v) => !v)}>
                  Email
                </Button>
                <Button type="button" size="sm" variant={prefTelegram ? "default" : "outline"} className="rounded-xl" onClick={() => setPrefTelegram((v) => !v)}>
                  Telegram
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quiet hours start (0-23)</Label>
              <Input className="rounded-xl" value={prefQuietStart} onChange={(e) => setPrefQuietStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quiet hours end (0-23)</Label>
              <Input className="rounded-xl" value={prefQuietEnd} onChange={(e) => setPrefQuietEnd(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={prefMut.isPending || (!prefEmail && !prefTelegram)}
                onClick={() =>
                  prefMut.mutate({
                    userId: myUser._id,
                    frequency: prefFrequency,
                    channels: { email: prefEmail, telegram: prefTelegram },
                    quietHours: {
                      startHour: Number(prefQuietStart),
                      endHour: Number(prefQuietEnd),
                    },
                  })
                }
              >
                Save preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">Roommates</h2>
          <p className="text-sm text-muted-foreground">Balances update from the shared ledger</p>
        </div>
        {isSuperAdmin ? (
          <Button className="h-11 rounded-xl gap-1 md:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Invite roommate
          </Button>
        ) : null}
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
              <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12 border">
                    {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                    <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{u.name}</CardTitle>
                    <CardDescription className="truncate">{u.email}</CardDescription>
                  </div>
                </div>
                {isSuperAdmin ? (
                  <div className="flex gap-1 self-end sm:self-start">
                    {u.status === "invited" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        disabled={resendMut.isPending}
                        onClick={() => resendMut.mutate(u._id)}
                        title="Resend invite"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl text-destructive"
                      onClick={() => setDeleteId(u._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <span className="text-xs text-muted-foreground">Total paid · {formatInr(u.totalPaid)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.balance > 0 ? "success" : u.balance < 0 ? "danger" : "secondary"}>
                      {u.balance > 0 ? "+" : ""}
                      {formatInr(u.balance)}
                    </Badge>
                    <Badge variant={u.status === "active" ? "success" : "secondary"} className="capitalize">
                      {u.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {u.status === "invited" && u.invitedAt
                    ? `Invited: ${new Date(u.invitedAt).toLocaleString()}`
                    : u.status === "active" && u.activatedAt
                      ? `Activated: ${new Date(u.activatedAt).toLocaleString()}`
                      : "Lifecycle timestamps unavailable"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit roommate" : "Invite roommate"}</DialogTitle>
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
              <Label htmlFor="uemail">Email</Label>
              <Input
                id="uemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                placeholder="roommate@email.com"
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
