import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_0%,hsl(280_60%_50%/0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_100%,hsl(200_70%_45%/0.1),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_0%,hsl(280_50%_40%/0.15),transparent_50%)]"
      />
      {children}
    </div>
  );
}
