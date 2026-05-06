"use client";

import { createUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { status, update } = useSession();
  const [step, setStep] = useState(1);
  const [houseName, setHouseName] = useState("");
  const [members, setMembers] = useState<{ name: string; email: string }[]>([{ name: "", email: "" }]);
  const [loadingHouse, setLoadingHouse] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/onboarding");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/house");
        if (!res.ok) return;
        const data = (await res.json()) as { displayName?: string };
        if (!cancelled && data.displayName) setHouseName(data.displayName);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingHouse(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveHouseAndContinue() {
    const name = houseName.trim();
    if (!name) {
      toast.error("Enter a house name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      if (!res.ok) {
        toast.error("Could not save house name");
        return;
      }
      setStep(2);
    } finally {
      setSaving(false);
    }
  }

  function setMemberAt(i: number, key: "name" | "email", value: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
  }

  function addMemberRow() {
    setMembers((prev) => [...prev, { name: "", email: "" }]);
  }

  function removeMemberRow(i: number) {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function finishOnboarding() {
    const rows = members
      .map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
      .filter((m) => m.name.length > 0 || m.email.length > 0);
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.name || !row.email) {
          toast.error("Each roommate needs name and email");
          return;
        }
        const res = await createUserAction({ name: row.name, email: row.email });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      }
      const done = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!done.ok) {
        toast.error("Could not finish onboarding");
        return;
      }
      await update?.();
      toast.success("You’re all set!");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function completeWithoutInvites() {
    setSaving(true);
    try {
      const done = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!done.ok) {
        toast.error("Could not finish onboarding");
        return;
      }
      await update?.();
      toast.success("Onboarding completed. You can invite roommates later.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loadingHouse) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4 md:py-8">
      <div className="mb-8 flex gap-2">
        <div
          className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
          aria-hidden
        />
        <div
          className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}
          aria-hidden
        />
      </div>

      {step === 1 ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold tracking-tight">Name your household</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This appears in the sidebar and reports. You can change it later.
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="houseName">House display name</Label>
            <Input
              id="houseName"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              placeholder="e.g. Sana Fathima Mansion"
              className="rounded-xl"
            />
          </div>
          <Button className="mt-8 w-full rounded-xl" onClick={saveHouseAndContinue} disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold tracking-tight">Add roommates (optional)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ledger members for splitting bills. If everyone already joined, skip now and invite later from Users.
          </p>
          <div className="mt-6 space-y-4">
            {members.map((m, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={m.name}
                  onChange={(e) => setMemberAt(i, "name", e.target.value)}
                  placeholder="Name"
                  className="rounded-xl"
                  aria-label={`Roommate name ${i + 1}`}
                />
                <Input
                  value={m.email}
                  type="email"
                  onChange={(e) => setMemberAt(i, "email", e.target.value)}
                  placeholder="Email"
                  className="rounded-xl"
                  aria-label={`Roommate email ${i + 1}`}
                />
                {members.length > 1 ? (
                  <Button type="button" variant="outline" onClick={() => removeMemberRow(i)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="secondary" className="rounded-xl" onClick={addMemberRow}>
              Add another
            </Button>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={completeWithoutInvites}
                disabled={saving}
              >
                {saving ? "Finishing…" : "Skip for now"}
              </Button>
              <Button className="rounded-xl sm:min-w-[10rem]" onClick={finishOnboarding} disabled={saving}>
                {saving ? "Finishing…" : "Finish with invites"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
