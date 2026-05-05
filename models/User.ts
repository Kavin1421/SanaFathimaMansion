import mongoose, { Schema, type Model, type Types } from "mongoose";

export type UserStatus = "invited" | "active" | "disabled";

export type UserDocument = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  status: UserStatus;
  invitedAt?: Date;
  activatedAt?: Date;
  lastReminderAt?: Date;
  avatar?: string;
  totalPaid: number;
  balance: number;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["invited", "active", "disabled"], default: "invited" },
    invitedAt: { type: Date },
    activatedAt: { type: Date },
    lastReminderAt: { type: Date },
    avatar: { type: String },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ name: 1 });

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
