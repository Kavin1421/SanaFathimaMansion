"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupFormSchema, type SignupFormInput } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const reduceMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignupFormInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = body.error;
        const message =
          typeof err === "string"
            ? err
            : err && typeof err === "object"
              ? "Please check your details and try again."
              : "Could not create account";
        toast.error(message);
        return;
      }
      const sign = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (sign?.error) {
        toast.success("Account created — please sign in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome! Let’s set up your household.");
      router.push("/onboarding");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {intent === "demo"
          ? "You’re exploring the demo path — create an account to try the full flow, or log in with the seeded demo user."
          : "You’ll name your house and add roommates next."}
      </p>

      <form className="mt-8 space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoComplete="name"
            className="rounded-xl bg-background/80"
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="rounded-xl bg-background/80"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="rounded-xl bg-background/80"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="rounded-xl bg-background/80"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        <motion.div whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
          <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </motion.div>
      </form>

      {googleEnabled ? (
        <>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/70 px-2 text-muted-foreground backdrop-blur dark:bg-slate-950/70">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl bg-background/60 backdrop-blur"
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          >
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
