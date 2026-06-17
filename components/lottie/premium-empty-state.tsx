"use client";

import { LottiePlayer } from "@/components/lottie/lottie-player";
import { getLottieScene, type LottieSceneKey } from "@/lib/lottie-catalog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  scene: LottieSceneKey;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
  compact?: boolean;
};

export function PremiumEmptyState({
  scene,
  title,
  description,
  className,
  children,
  compact = false,
}: Props) {
  const cfg = getLottieScene(scene);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-6" : "gap-3 py-10",
        className,
      )}
    >
      <LottiePlayer
        src={cfg.src}
        width={compact ? cfg.w - 20 : cfg.w}
        height={compact ? cfg.h - 20 : cfg.h}
        loop={cfg.loop}
        speed={cfg.speed}
        fallbackIcon={cfg.fallback}
        ariaLabel={title}
      />
      <div className="max-w-sm space-y-1 px-4">
        <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        {description ? (
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
