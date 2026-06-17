"use client";

import { cn } from "@/lib/utils";
import type { LottieRefCurrentProps } from "lottie-react";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export type LottiePlayerProps = {
  src: string;
  width?: number;
  height?: number;
  loop?: boolean;
  speed?: number;
  className?: string;
  /** Pause when off-screen (default true). */
  playOnVisible?: boolean;
  ariaLabel?: string;
  fallbackIcon?: LucideIcon;
};

export function LottiePlayer({
  src,
  width = 140,
  height = 140,
  loop = true,
  speed = 0.7,
  className,
  playOnVisible = true,
  ariaLabel,
  fallbackIcon: FallbackIcon,
}: LottiePlayerProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [data, setData] = useState<object | null>(null);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("lottie fetch failed");
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!playOnVisible || reduceMotion) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "48px", threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [playOnVisible, reduceMotion]);

  useEffect(() => {
    const inst = lottieRef.current;
    if (!inst || reduceMotion) return;
    if (visible) inst.play();
    else inst.pause();
  }, [visible, reduceMotion, data]);

  const showFallback = reduceMotion || failed || !data;

  if (showFallback) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground/70",
          className,
        )}
        style={{ width, height }}
        aria-hidden={!ariaLabel}
        aria-label={ariaLabel}
        role={ariaLabel ? "img" : undefined}
      >
        {FallbackIcon ? <FallbackIcon className="h-10 w-10 opacity-70" strokeWidth={1.5} /> : null}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none select-none", className)}
      style={{ width, height }}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={data}
        loop={loop}
        autoplay={visible}
        style={{ width, height }}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        onConfigReady={() => {
          lottieRef.current?.setSpeed(speed);
        }}
      />
    </div>
  );
}
