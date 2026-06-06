"use client";

import { requestPasswordResetAction } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await requestPasswordResetAction({ email: email.trim() });
      if (!r.ok) throw new Error(r.error);
      setSent(true);
      toast.success("If an account exists, a reset link was sent");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Check your inbox for a reset link. It expires in 1 hour.
        </p>
        <Button asChild variant="outline" className="w-full rounded-xl">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl"
          required
        />
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send reset link
      </Button>
      <Button asChild variant="ghost" className="w-full rounded-xl">
        <Link href="/login">Back to login</Link>
      </Button>
    </form>
  );
}
