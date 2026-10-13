import { connectDb } from "@/lib/db";
import {
  createQueueId,
  htmlToPlain,
} from "@/lib/whatsapp-queue";
import { whatsappImageUrls } from "@/lib/whatsapp-images";
import { WhatsAppOutbox } from "@/models/WhatsAppOutbox";
import { appendNotificationEvent } from "@/services/notification-events";

const DEDUPE_WINDOW_MS = 120_000;
const GATEWAY_TIMEOUT_MS = 4_000;

function gatewayConfig(): { url: string; token: string } | null {
  const url = process.env.WHATSAPP_GATEWAY_URL?.trim().replace(/\/$/, "");
  const token = process.env.WHATSAPP_GATEWAY_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function whatsappEventType(eventType: string): string {
  if (eventType.startsWith("whatsapp_")) return eventType;
  if (eventType.startsWith("telegram_")) return `whatsapp_${eventType.slice("telegram_".length)}`;
  return `whatsapp_${eventType}`;
}

async function recordWhatsApp(input: {
  eventType: string;
  status: "sent" | "failed" | "skipped" | "queued";
  message?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await appendNotificationEvent({
    channel: "whatsapp",
    eventType: input.eventType,
    status: input.status,
    recipient: process.env.WHATSAPP_TO?.trim() || "household-whatsapp",
    message: input.message,
    metadata: input.metadata ?? null,
  });
}

/**
 * Persist every alert, then try the Kevin WhatsApp gateway.
 * If the gateway is down, the row stays queued and the gateway drains it from Mongo via Redis.
 */
export async function dispatchWhatsApp(input: {
  text: string;
  imageUrls?: string[];
  eventType: string;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string;
}): Promise<void> {
  const text = input.text.trim();
  if (!text) return;
  const imageUrls = whatsappImageUrls(input.imageUrls);

  const eventType = whatsappEventType(input.eventType);
  const metadata = { ...(input.metadata ?? {}) };

  try {
    await connectDb();

    if (input.dedupeKey) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
      const existing = await WhatsAppOutbox.findOne({
        dedupeKey: input.dedupeKey,
        status: { $in: ["queued", "sending", "sent"] },
        createdAt: { $gte: since },
      })
        .select("queueId")
        .lean();
      if (existing) {
        await recordWhatsApp({
          eventType,
          status: "skipped",
          message: `Duplicate suppressed (${existing.queueId})`,
          metadata: { ...metadata, queueId: existing.queueId, dedupeKey: input.dedupeKey },
        });
        return;
      }
    }

    const queueId = createQueueId();
    const createdAt = new Date();
    await WhatsAppOutbox.create({
      queueId,
      text,
      ...(imageUrls.length > 0 ? { imageUrls } : {}),
      eventType,
      dedupeKey: input.dedupeKey,
      status: "queued",
      offlineAtEnqueue: false,
      attempts: 0,
      metadata,
      createdAt,
    });

    const gateway = gatewayConfig();
    if (!gateway) {
      await recordWhatsApp({
        eventType,
        status: "queued",
        message: `Queued as ${queueId}. The WhatsApp gateway will send it when it is reachable.`,
        metadata: { ...metadata, queueId, dedupeKey: input.dedupeKey },
      });
      return;
    }

    try {
      const res = await fetch(`${gateway.url}/v1/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gateway.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueId,
          text,
          ...(imageUrls.length > 0 ? { imageUrls } : {}),
          eventType,
          createdAt: createdAt.toISOString(),
          offlineAtEnqueue: false,
        }),
        signal: AbortSignal.timeout(imageUrls.length > 0 ? 25_000 : GATEWAY_TIMEOUT_MS),
      });

      if (res.ok) {
        const body = (await res.json()) as { status?: string; queueId?: string };
        if (body.status === "sent") {
          await WhatsAppOutbox.updateOne(
            { queueId },
            { $set: { status: "sent", sentAt: new Date() } },
          );
          await recordWhatsApp({
            eventType,
            status: "sent",
            message: `Sent (${queueId})`,
            metadata: { ...metadata, queueId, dedupeKey: input.dedupeKey },
          });
          return;
        }

        await recordWhatsApp({
          eventType,
          status: "queued",
          message: `Accepted by gateway as ${queueId}. It will send when WhatsApp reconnects.`,
          metadata: { ...metadata, queueId, dedupeKey: input.dedupeKey },
        });
        return;
      }
    } catch (error) {
      console.error("[whatsapp] gateway unreachable", error instanceof Error ? error.message : error);
    }

    await WhatsAppOutbox.updateOne({ queueId, status: "queued" }, { $set: { offlineAtEnqueue: true } });
    await recordWhatsApp({
      eventType,
      status: "queued",
      message: `WhatsApp server unavailable. Stored as ${queueId} and will send when it is back.`,
      metadata: { ...metadata, queueId, dedupeKey: input.dedupeKey, offlineAtEnqueue: true },
    });
  } catch (error) {
    console.error("[whatsapp] dispatch", error);
    try {
      await recordWhatsApp({
        eventType,
        status: "failed",
        message: error instanceof Error ? error.message : "Could not queue WhatsApp message",
        metadata,
      });
    } catch (recordError) {
      console.error("[whatsapp] record failure", recordError);
    }
  }
}

export function plainTextForWhatsApp(input: {
  html?: string;
  plain?: string;
  captionHtml?: string;
}): string {
  const ready = input.plain?.trim();
  return ready || htmlToPlain(input.html || input.captionHtml || "");
}
