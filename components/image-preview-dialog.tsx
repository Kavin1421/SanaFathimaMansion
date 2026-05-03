"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BillImagePanel } from "@/components/bill-image-panel";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

type Props = {
  src: string;
  title?: string;
};

export function ImagePreviewDialog({ src, title = "Bill" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
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
        </DialogHeader>
        <div className="px-6 pb-6 pt-2">
          <BillImagePanel key={open ? "open" : "closed"} src={src} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
