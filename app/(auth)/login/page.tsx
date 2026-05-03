import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.length && process.env.GOOGLE_CLIENT_SECRET?.length);
}

export default function LoginPage() {
  const googleEnabled = googleConfigured();
  return (
    <AuthLayout
      title="Log in to your household"
      subtitle="Pick up where you left off — balances, expenses, and reports stay in sync."
    >
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </AuthLayout>
  );
}
