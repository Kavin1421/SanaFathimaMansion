"use client";

import { Button } from "@/components/ui/button";
import { Download, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

type Props = {
  src: string;
  title?: string;
};

export function BillImagePanel({ src, title = "Bill" }: Props) {
  const [scale, setScale] = useState(1);

  const zoomIn = () => setScale((s) => Math.min(3, Math.round((s + 0.25) * 100) / 100));
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));

  const download = useCallback(async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-bill`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank", "noreferrer");
    }
  }, [src, title]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <input
          type="range"
          min={50}
          max={300}
          step={5}
          value={scale * 100}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          className="h-2 w-36 cursor-pointer accent-primary"
          aria-label="Zoom"
        />
        <Button type="button" variant="secondary" size="sm" className="rounded-xl" onClick={download}>
          <Download className="mr-1 h-4 w-4" />
          Download
        </Button>
      </div>
      <div className="max-h-[min(60vh,480px)] overflow-auto rounded-xl border bg-muted/20 p-3">
        <div
          className="flex justify-center transition-transform duration-150 ease-out"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          <Image
            src={src}
            alt={title}
            width={960}
            height={720}
            className="h-auto max-w-full rounded-md object-contain"
            sizes="(max-width: 768px) 100vw, 720px"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
