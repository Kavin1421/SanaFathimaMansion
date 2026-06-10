import mongoose, { Schema, type Model, type Types } from "mongoose";

export type NotificationChannel = "email" | "telegram";
export type NotificationStatus = "sent" | "failed" | "skipped";

export type NotificationEventDocument = {
  _id: Types.ObjectId;
  channel: NotificationChannel;
  eventType: string;
  status: NotificationStatus;
  recipient?: string;
  message?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

const notificationEventSchema = new Schema<NotificationEventDocument>(
  {
    channel: { type: String, enum: ["email", "telegram"], required: true },
    eventType: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    recipient: { type: String },
    message: { type: String },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationEventSchema.index({ channel: 1, createdAt: -1 });
notificationEventSchema.index({ eventType: 1, createdAt: -1 });
notificationEventSchema.index({ status: 1, createdAt: -1 });
notificationEventSchema.index({ "metadata.dedupeKey": 1, createdAt: -1 });

export const NotificationEvent: Model<NotificationEventDocument> =
  mongoose.models.NotificationEvent ??
  mongoose.model<NotificationEventDocument>("NotificationEvent", notificationEventSchema);
