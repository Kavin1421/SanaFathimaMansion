"use client";

import { toUserMessage, type UserMessageContext } from "@/lib/user-messages";
import { toast } from "sonner";

export function showUserError(error: unknown, context: UserMessageContext = "generic"): string {
  const message = toUserMessage(error, context);
  toast.error(message, {
    duration: 6000,
  });
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    console.error("[user-error]", context, error);
  }
  return message;
}

export function showUserSuccess(message: string): void {
  toast.success(message);
}
