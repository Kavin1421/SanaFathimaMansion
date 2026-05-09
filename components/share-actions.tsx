"use client";

import { Button } from "@/components/ui/button";
import { buildTelegramShareUrl, shareTextNative } from "@/lib/share";
import { MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  summaryText: string;
};

export function ShareActions({ summaryText }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={async () => {
          const ok = await shareTextNative(summaryText, "House expenses");
          if (ok) toast.success("Shared");
          else {
            window.open(buildTelegramShareUrl(summaryText), "_blank", "noopener,noreferrer");
            toast.message("Opening Telegram…");
          }
        }}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={() => {
          window.open(buildTelegramShareUrl(summaryText), "_blank", "noopener,noreferrer");
        }}
      >
        <MessageCircle className="h-4 w-4" />
        Telegram
      </Button>
    </div>
  );
}
