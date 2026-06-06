import mongoose, { Schema, type Model, type Types } from "mongoose";

export type PasswordResetTokenDocument = {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
};

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ accountId: 1, createdAt: -1 });

export const PasswordResetToken: Model<PasswordResetTokenDocument> =
  mongoose.models.PasswordResetToken ??
  mongoose.model<PasswordResetTokenDocument>("PasswordResetToken", passwordResetTokenSchema);
