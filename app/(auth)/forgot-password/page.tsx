import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a secure link to choose a new password.">
      <div className="rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <ForgotPasswordForm />
      </div>
    </AuthLayout>
  );
}
