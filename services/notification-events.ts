import { connectDb } from "@/lib/db";
import { NotificationEvent } from "@/models/NotificationEvent";

export async function appendNotificationEvent(input: {
  channel: "email" | "telegram";
  eventType: string;
  status: "sent" | "failed" | "skipped";
  recipient?: string;
  message?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await connectDb();
  await NotificationEvent.create({
    channel: input.channel,
    eventType: input.eventType,
    status: input.status,
    recipient: input.recipient,
    message: input.message,
    metadata: input.metadata ?? null,
  });
}

export type NotificationEventRow = {
  _id: string;
  channel: "email" | "telegram";
  eventType: string;
  status: "sent" | "failed" | "skipped";
  recipient?: string;
  message?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export async function listNotificationEvents(params: {
  channel?: "email" | "telegram";
  status?: "sent" | "failed" | "skipped";
  eventType?: string;
  search?: string;
  limit: number;
  skip: number;
}): Promise<{ rows: NotificationEventRow[]; total: number }> {
  await connectDb();
  const q: Record<string, unknown> = {};
  if (params.channel) q.channel = params.channel;
  if (params.status) q.status = params.status;
  if (params.eventType) q.eventType = params.eventType;
  if (params.search?.trim()) {
    const s = params.search.trim();
    q.$or = [{ recipient: { $regex: s, $options: "i" } }, { message: { $regex: s, $options: "i" } }];
  }

  const [rows, total] = await Promise.all([
    NotificationEvent.find(q)
      .sort({ createdAt: -1 })
      .skip(params.skip)
      .limit(params.limit)
      .lean()
      .exec(),
    NotificationEvent.countDocuments(q),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      _id: String(r._id),
      channel: r.channel as "email" | "telegram",
      eventType: String(r.eventType),
      status: r.status as "sent" | "failed" | "skipped",
      recipient: r.recipient ?? undefined,
      message: r.message ?? undefined,
      metadata: (r.metadata as Record<string, unknown> | null | undefined) ?? null,
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  };
}
