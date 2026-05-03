import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/signup-form";
import { Suspense } from "react";

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.length && process.env.GOOGLE_CLIENT_SECRET?.length);
}

export default function SignupPage() {
  const googleEnabled = googleConfigured();
  return (
    <AuthLayout
      title="Start your household ledger"
      subtitle="One account for you; we’ll help you name the place and add roommates in the next step."
    >
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted/40" />}>
        <SignupForm googleEnabled={googleEnabled} />
      </Suspense>
    </AuthLayout>
  );
}
