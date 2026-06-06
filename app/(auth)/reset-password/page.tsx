import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account.">
      <div className="rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthLayout>
  );
}
