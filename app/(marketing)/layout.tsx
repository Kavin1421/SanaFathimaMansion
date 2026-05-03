import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] min-h-screen overflow-x-hidden bg-background pb-[env(safe-area-inset-bottom)] dark:bg-[hsl(229_48%_6%)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-25%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_0%,rgba(168,85,247,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(56,189,248,0.08),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(ellipse_80%_55%_at_100%_10%,rgba(168,85,247,0.18),transparent_48%),radial-gradient(ellipse_60%_45%_at_0%_100%,rgba(56,189,248,0.1),transparent_42%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(99,102,241,0.12),transparent_60%)]"
      />
      {children}
    </div>
  );
}
