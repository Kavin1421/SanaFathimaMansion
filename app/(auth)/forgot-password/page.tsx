import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Password reset by email isn’t wired yet — contact your admin or sign in with a seeded demo account locally."
    >
      <div className="rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-sm text-muted-foreground">
          For production, you’d send a secure link here. For this MVP, use an admin-assisted reset or
          recreate your account in development.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link href="/login">Back to login</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/signup">Create a new account</Link>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
