import { randomBytes } from "crypto";

/** How long a job may wait before the delivered text is stamped with its queue id. */
export const QUEUE_STAMP_AFTER_MS = 20_000;

export function createQueueId(now = Date.now()): string {
  const ts = now.toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `Q-${ts}${rand}`;
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shouldStampQueueId(input: {
  offlineAtEnqueue: boolean;
  createdAtMs: number;
  nowMs?: number;
}): boolean {
  if (input.offlineAtEnqueue) return true;
  const now = input.nowMs ?? Date.now();
  return now - input.createdAtMs >= QUEUE_STAMP_AFTER_MS;
}

/** Quiet footer so a delayed alert can be matched to the notification log. */
export function formatQueuedWhatsAppMessage(text: string, queueId: string): string {
  const mark = `Queued as ${queueId}`;
  if (text.includes(mark)) return text;
  return `${text.trim()}\n\n—\n${mark}\nHeld while WhatsApp was offline, delivered when it returned.`;
}
