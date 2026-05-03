"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon, Minus, Plus } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  src: string;
  title?: string;
};

export function ImagePreviewDialog({ src, title = "Bill" }: Props) {
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState(false);

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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setScale(1);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1 rounded-xl">
          <ImageIcon className="h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl p-0 sm:p-0">
        <DialogHeader className="border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>{title}</DialogTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </DialogHeader>
        <div className="max-h-[calc(90vh-8rem)] overflow-auto bg-muted/20 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- zoom/transform simpler than next/image */}
          <img
            src={src}
            alt={title}
            className="mx-auto h-auto max-w-none origin-top transition-transform duration-150 ease-out"
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
