import mongoose, { Schema, type Model, type Types } from "mongoose";

export type WhatsAppOutboxStatus = "queued" | "sending" | "sent" | "failed";

export type WhatsAppOutboxDocument = {
  _id: Types.ObjectId;
  queueId: string;
  text: string;
  imageUrls?: string[];
  eventType: string;
  dedupeKey?: string;
  status: WhatsAppOutboxStatus;
  offlineAtEnqueue: boolean;
  attempts: number;
  lastError?: string;
  metadata?: Record<string, unknown> | null;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const whatsAppOutboxSchema = new Schema<WhatsAppOutboxDocument>(
  {
    queueId: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    imageUrls: { type: [String], default: undefined },
    eventType: { type: String, required: true },
    dedupeKey: { type: String },
    status: { type: String, enum: ["queued", "sending", "sent", "failed"], default: "queued" },
    offlineAtEnqueue: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    metadata: { type: Schema.Types.Mixed, default: null },
    sentAt: { type: Date },
  },
  { timestamps: true, collection: "whatsapp_outbox" },
);

whatsAppOutboxSchema.index({ status: 1, createdAt: 1 });
whatsAppOutboxSchema.index({ dedupeKey: 1, createdAt: -1 });

export const WhatsAppOutbox: Model<WhatsAppOutboxDocument> =
  mongoose.models.WhatsAppOutbox ??
  mongoose.model<WhatsAppOutboxDocument>("WhatsAppOutbox", whatsAppOutboxSchema);
