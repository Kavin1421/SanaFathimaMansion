"use client";

import { Button } from "@/components/ui/button";
import { buildWhatsAppShareUrl, shareTextNative } from "@/lib/whatsapp";
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
            window.open(buildWhatsAppShareUrl(summaryText), "_blank", "noopener,noreferrer");
            toast.message("Opening WhatsApp…");
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
          window.open(buildWhatsAppShareUrl(summaryText), "_blank", "noopener,noreferrer");
        }}
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
    </div>
  );
}
