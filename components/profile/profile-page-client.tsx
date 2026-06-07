"use client";

import { updateAccountProfileAction } from "@/app/actions/account";
import { changePasswordAction } from "@/app/actions/password";
import { updateReminderPreferencesAction } from "@/app/actions/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleBadge } from "@/components/users/role-badge";
import { RolePermissionsCard } from "@/components/profile/role-permissions-card";
import { queryKeys } from "@/lib/query-keys";
import type { UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilePageClient() {
  const { data: session, update } = useSession();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [prefFrequency, setPrefFrequency] = useState<"daily" | "weekly">("daily");
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefTelegram, setPrefTelegram] = useState(true);
  const [prefQuietStart, setPrefQuietStart] = useState("22");
  const [prefQuietEnd, setPrefQuietEnd] = useState("8");

  const { data: users } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("users");
      return r.json();
    },
  });

  const myUser = users?.find((u) => u._id === session?.user?.ledgerUserId) ?? null;

  useEffect(() => {
    if (!session?.user) return;
    setName(session.user.name ?? "");
    setImage(session.user.image ?? null);
  }, [session?.user?.name, session?.user?.image, session?.user]);

  useEffect(() => {
    if (!myUser?.reminderPreferences) return;
    setPrefFrequency(myUser.reminderPreferences.frequency);
    setPrefEmail(myUser.reminderPreferences.channels.email);
    setPrefTelegram(myUser.reminderPreferences.channels.telegram);
    setPrefQuietStart(String(myUser.reminderPreferences.quietHours.startHour));
    setPrefQuietEnd(String(myUser.reminderPreferences.quietHours.endHour));
  }, [myUser]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const r = await updateAccountProfileAction({ name: trimmed, image: image ?? null });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: async (data) => {
      await update?.({ name: data.name, image: data.image ?? null });
      qc.invalidateQueries({ queryKey: queryKeys.users });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prefMut = useMutation({
    mutationFn: async () => {
      if (!myUser) throw new Error("Link your account to a household member first");
      const r = await updateReminderPreferencesAction({
        userId: myUser._id,
        frequency: prefFrequency,
        channels: { email: prefEmail, telegram: prefTelegram },
        quietHours: { startHour: Number(prefQuietStart), endHour: Number(prefQuietEnd) },
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Reminder preferences saved");
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMut = useMutation({
    mutationFn: async () => {
      const r = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImage(data.url as string);
      toast.success("Photo uploaded — save to apply");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const initials = initialsFromName(name || session?.user?.name || "?");
  const email = session?.user?.email ?? "";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Your profile</h2>
          {session?.user ? (
            <RoleBadge role={session.user.role} isSuperAdmin={session.user.isSuperAdmin} />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name, photo, reminders, and password.
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Account details</CardTitle>
          <CardDescription>Your sign-in email cannot be changed here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border-2">
              {image ? <AvatarImage src={image} alt={name || "Profile"} /> : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={uploading || saveMut.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading…" : "Upload photo"}
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive"
                  disabled={uploading || saveMut.isPending}
                  onClick={() => setImage(null)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={email} readOnly disabled className="rounded-xl" />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-xl"
              disabled={saveMut.isPending || uploading || name.trim().length < 1}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RolePermissionsCard />

      {myUser ? (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Reminder preferences</CardTitle>
            <CardDescription>Balance reminders and monthly summaries.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={prefFrequency} onValueChange={(v) => setPrefFrequency(v as "daily" | "weekly")}>
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
                <Button
                  type="button"
                  size="sm"
                  variant={prefEmail ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setPrefEmail((v) => !v)}
                >
                  Email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={prefTelegram ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setPrefTelegram((v) => !v)}
                >
                  Telegram
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quiet hours start (0–23)</Label>
                <Input className="rounded-xl" value={prefQuietStart} onChange={(e) => setPrefQuietStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quiet hours end (0–23)</Label>
                <Input className="rounded-xl" value={prefQuietEnd} onChange={(e) => setPrefQuietEnd(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              className="rounded-xl"
              disabled={prefMut.isPending || (!prefEmail && !prefTelegram)}
              onClick={() => prefMut.mutate()}
            >
              {prefMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save reminder preferences
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-dashed shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Reminder preferences become available once your sign-in is linked to a household member.
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Change password</CardTitle>
          <CardDescription>For email/password sign-in. Google-only accounts can skip this.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
              minLength={8}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={
              passwordMut.isPending ||
              !currentPassword ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
            onClick={() => passwordMut.mutate()}
          >
            {passwordMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
