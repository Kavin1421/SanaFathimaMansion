import mongoose, { Schema, type Model, type Types } from "mongoose";
import { AUDIT_ACTION_TYPES, type AuditActionType } from "@/lib/audit-constants";

export type { AuditActionType };
export { AUDIT_ACTION_TYPES };

export type AuditPerformedBy = {
  accountId: string;
  email: string;
  name: string;
};

export type AuditTargetEntity = {
  type: "expense" | "user" | "month" | "session" | "settlement" | "house" | "onboarding";
  id?: string;
  label?: string;
};

export type AuditLogDocument = {
  _id: Types.ObjectId;
  actionType: AuditActionType;
  performedBy: AuditPerformedBy;
  targetEntity: AuditTargetEntity;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  createdAt: Date;
};

const performedBySchema = new Schema<AuditPerformedBy>(
  {
    accountId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const targetEntitySchema = new Schema<AuditTargetEntity>(
  {
    type: {
      type: String,
      required: true,
      enum: ["expense", "user", "month", "session", "settlement", "house", "onboarding"],
    },
    id: { type: String },
    label: { type: String },
  },
  { _id: false },
);

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actionType: { type: String, required: true, enum: [...AUDIT_ACTION_TYPES] },
    performedBy: { type: performedBySchema, required: true },
    targetEntity: { type: targetEntitySchema, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actionType: 1, createdAt: -1 });
auditLogSchema.index({ "performedBy.accountId": 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog ?? mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
